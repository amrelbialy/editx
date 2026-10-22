import { readArchiveZip, writeArchiveZip } from "./archive-codec";
import { collectArchiveAssets, collectArchiveFonts } from "./archive-dependencies";
import { EditxArchiveError } from "./archive-error";
import { EDITX_ARCHIVE_LIMITS } from "./archive-limits";
import {
  type CreateEditxArchiveInput,
  EDITX_ARCHIVE_KIND,
  EDITX_ARCHIVE_PATHS,
  EDITX_ARCHIVE_SCHEMA_VERSION,
  type EditxArchiveInfoV1,
  type EditxArchiveManifestV1,
  type ReadEditxArchiveResultV1,
} from "./archive-types";
import {
  jsonEqual,
  parseJsonMember,
  validateNativeDocument,
  validatePng,
  validateRootManifest,
} from "./archive-validation";

const encoder = new TextEncoder();

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function rootManifest(preview: boolean): EditxArchiveManifestV1 {
  return {
    kind: EDITX_ARCHIVE_KIND,
    schemaVersion: EDITX_ARCHIVE_SCHEMA_VERSION,
    selfContained: false,
    members: {
      document: EDITX_ARCHIVE_PATHS.document,
      assetsManifest: EDITX_ARCHIVE_PATHS.assetsManifest,
      fontsManifest: EDITX_ARCHIVE_PATHS.fontsManifest,
      ...(preview ? { preview: EDITX_ARCHIVE_PATHS.preview } : {}),
    },
  };
}

function required(entries: ReadonlyMap<string, Uint8Array>, path: string): Uint8Array {
  const bytes = entries.get(path);
  if (!bytes) {
    throw new EditxArchiveError("MISSING_MEMBER", `Missing archive member: ${path}`, {
      entryPath: path,
    });
  }
  return bytes;
}

function checkBytes(length: number, maximum: number, limit: "documentBytes" | "manifestBytes") {
  if (length > maximum) {
    throw new EditxArchiveError("LIMIT_EXCEEDED", `${limit} exceeded`, { limit });
  }
}

function validateReport(bytes: Uint8Array, path: string, expected: unknown): void {
  if (!jsonEqual(parseJsonMember(bytes, path), expected)) {
    throw new EditxArchiveError(
      "INVALID_MANIFEST",
      `${path} does not match the document dependency inventory`,
      { entryPath: path },
    );
  }
}

export function createEditxArchive(input: CreateEditxArchiveInput): Uint8Array {
  if (!input || typeof input !== "object" || typeof input.documentJson !== "string") {
    throw new EditxArchiveError("INVALID_DOCUMENT", "documentJson must be a string");
  }
  if (input.preview !== undefined && !(input.preview instanceof Uint8Array)) {
    throw new EditxArchiveError("INVALID_PREVIEW", "preview must be a Uint8Array");
  }
  const documentBytes = encoder.encode(input.documentJson);
  checkBytes(documentBytes.length, EDITX_ARCHIVE_LIMITS.documentBytes, "documentBytes");
  const { document } = validateNativeDocument(documentBytes);
  if (input.preview) {
    if (input.preview.length > EDITX_ARCHIVE_LIMITS.entryUncompressedBytes) {
      throw new EditxArchiveError("LIMIT_EXCEEDED", "Preview exceeds its entry limit", {
        entryPath: EDITX_ARCHIVE_PATHS.preview,
        limit: "entryUncompressedBytes",
      });
    }
    validatePng(input.preview);
  }

  const manifest = encoder.encode(JSON.stringify(rootManifest(input.preview !== undefined)));
  const assets = encoder.encode(JSON.stringify(collectArchiveAssets(document)));
  const fonts = encoder.encode(JSON.stringify(collectArchiveFonts(document)));
  checkBytes(manifest.length, EDITX_ARCHIVE_LIMITS.manifestBytes, "manifestBytes");
  checkBytes(assets.length, EDITX_ARCHIVE_LIMITS.manifestBytes, "manifestBytes");
  checkBytes(fonts.length, EDITX_ARCHIVE_LIMITS.manifestBytes, "manifestBytes");
  return writeArchiveZip([
    { path: EDITX_ARCHIVE_PATHS.manifest, bytes: manifest, store: false },
    { path: EDITX_ARCHIVE_PATHS.document, bytes: documentBytes, store: false },
    { path: EDITX_ARCHIVE_PATHS.assetsManifest, bytes: assets, store: false },
    { path: EDITX_ARCHIVE_PATHS.fontsManifest, bytes: fonts, store: false },
    ...(input.preview
      ? [{ path: EDITX_ARCHIVE_PATHS.preview, bytes: input.preview, store: true }]
      : []),
  ]);
}

export function readEditxArchive(bytes: Uint8Array): ReadEditxArchiveResultV1 {
  const entries = readArchiveZip(bytes);
  const manifest = validateRootManifest(
    parseJsonMember(required(entries, EDITX_ARCHIVE_PATHS.manifest), EDITX_ARCHIVE_PATHS.manifest),
    entries,
  );
  const { json, document } = validateNativeDocument(
    required(entries, EDITX_ARCHIVE_PATHS.document),
  );
  const assets = deepFreeze(collectArchiveAssets(document));
  const fonts = deepFreeze(collectArchiveFonts(document));
  validateReport(
    required(entries, EDITX_ARCHIVE_PATHS.assetsManifest),
    EDITX_ARCHIVE_PATHS.assetsManifest,
    assets,
  );
  validateReport(
    required(entries, EDITX_ARCHIVE_PATHS.fontsManifest),
    EDITX_ARCHIVE_PATHS.fontsManifest,
    fonts,
  );
  const previewBytes = entries.get(EDITX_ARCHIVE_PATHS.preview);
  if (previewBytes) validatePng(previewBytes);
  return {
    manifest: deepFreeze(manifest),
    assets,
    fonts,
    documentJson: json,
    ...(previewBytes ? { preview: previewBytes.slice() } : {}),
  };
}

export function archiveInfo(result: ReadEditxArchiveResultV1): EditxArchiveInfoV1 {
  return Object.freeze({
    manifest: result.manifest,
    assets: result.assets,
    fonts: result.fonts,
  });
}
