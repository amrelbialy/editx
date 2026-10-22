import type { TextRun } from "../block";
import { FILL_IMAGE_SRC, FONT_FAMILY, IMAGE_SRC, TEXT_RUNS } from "../block/property-keys";
import type { EditxDocumentV1 } from "../document-types";
import type {
  EditxArchiveAssetClassification,
  EditxArchiveAssetDependencyV1,
  EditxArchiveAssetLocationV1,
  EditxArchiveAssetsManifestV1,
  EditxArchiveFontDependencyV1,
  EditxArchiveFontLocationV1,
  EditxArchiveFontsManifestV1,
} from "./archive-types";

const encoder = new TextEncoder();

function opaqueAssetId(key: string): string {
  let hash = 0x811c9dc5;
  for (const byte of encoder.encode(key)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return `asset-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function classify(source: string | undefined): EditxArchiveAssetClassification {
  if (!source) return "unresolved";
  if (/^data:/i.test(source)) return "inline-data";
  if (/^blob:/i.test(source)) return "blob-url";
  if (/^(?:https?:)?\/\//i.test(source)) return "external-url";
  return "relative-or-opaque";
}

export function collectArchiveAssets(document: EditxDocumentV1): EditxArchiveAssetsManifestV1 {
  const grouped = new Map<
    string,
    {
      classification: EditxArchiveAssetClassification;
      source?: string;
      locations: EditxArchiveAssetLocationV1[];
    }
  >();

  const add = (
    blockId: number,
    property: EditxArchiveAssetLocationV1["property"],
    raw: unknown,
  ) => {
    const source = typeof raw === "string" && raw.length > 0 ? raw : undefined;
    const classification = classify(source);
    const key = `${classification}\0${source ?? ""}`;
    const group = grouped.get(key) ?? { classification, source, locations: [] };
    group.locations.push({ blockId, property });
    grouped.set(key, group);
  };

  for (const block of document.scene.blocks) {
    if (block.type === "image" || block.type === "page") {
      add(block.id, IMAGE_SRC, block.properties[IMAGE_SRC]);
    }
    if (block.type === "fill" && block.kind === "image") {
      add(block.id, FILL_IMAGE_SRC, block.properties[FILL_IMAGE_SRC]);
    }
  }

  const dependencies: EditxArchiveAssetDependencyV1[] = [];
  const ids = new Set<string>();
  for (const [key, group] of grouped) {
    const stem = opaqueAssetId(key);
    let id = stem;
    for (let suffix = 2; ids.has(id); suffix++) id = `${stem}-${suffix}`;
    ids.add(id);
    const base = {
      id,
      type: "image" as const,
      locations: group.locations,
    };
    if (group.classification === "inline-data" || group.classification === "unresolved") {
      dependencies.push({ ...base, classification: group.classification });
    } else {
      dependencies.push({
        ...base,
        classification: group.classification,
        source: group.source!,
      });
    }
  }
  return { kind: "editx-assets-manifest", schemaVersion: 1, dependencies };
}

function normalizedFamily(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function collectArchiveFonts(document: EditxDocumentV1): EditxArchiveFontsManifestV1 {
  const grouped = new Map<
    string,
    { family: string | null; implicit: boolean; locations: EditxArchiveFontLocationV1[] }
  >();
  const add = (family: string | null, implicit: boolean, location: EditxArchiveFontLocationV1) => {
    const key = `${implicit ? "implicit" : "explicit"}\0${family ?? ""}`;
    const group = grouped.get(key) ?? { family, implicit, locations: [] };
    group.locations.push(location);
    grouped.set(key, group);
  };

  for (const block of document.scene.blocks) {
    if (block.type !== "text") continue;
    const persisted = Object.getOwnPropertyDescriptor(block.properties, FONT_FAMILY) !== undefined;
    const fallback = normalizedFamily(block.properties[FONT_FAMILY]);
    if (persisted) add(fallback, false, { blockId: block.id, property: FONT_FAMILY });

    const runs = block.properties[TEXT_RUNS] as readonly TextRun[] | undefined;
    if (!runs || runs.length === 0) {
      add(fallback, true, {
        blockId: block.id,
        property: "text/runs.style.fontFamily",
        runIndex: null,
      });
      continue;
    }
    runs.forEach((run, runIndex) => {
      const explicit = normalizedFamily(run.style.fontFamily);
      add(explicit ?? fallback, explicit === null, {
        blockId: block.id,
        property: "text/runs.style.fontFamily",
        runIndex,
      });
    });
  }

  const dependencies: EditxArchiveFontDependencyV1[] = [];
  for (const group of grouped.values()) {
    dependencies.push({ ...group, resolution: "unresolved" });
  }
  return { kind: "editx-fonts-manifest", schemaVersion: 1, dependencies };
}
