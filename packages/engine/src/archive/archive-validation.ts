import type { EditxDocumentV1 } from "../document-types";
import { validateDocument } from "../document-validation";
import { EditxArchiveError } from "./archive-error";
import {
  EDITX_ARCHIVE_KIND,
  EDITX_ARCHIVE_PATHS,
  EDITX_ARCHIVE_SCHEMA_VERSION,
  type EditxArchiveManifestV1,
} from "./archive-types";

const decoder = new TextDecoder("utf-8", { fatal: true });
const requiredPaths = [
  EDITX_ARCHIVE_PATHS.manifest,
  EDITX_ARCHIVE_PATHS.document,
  EDITX_ARCHIVE_PATHS.assetsManifest,
  EDITX_ARCHIVE_PATHS.fontsManifest,
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseJsonMember(bytes: Uint8Array, path: string): unknown {
  try {
    return JSON.parse(decoder.decode(bytes));
  } catch (cause) {
    throw new EditxArchiveError(
      path === EDITX_ARCHIVE_PATHS.document ? "INVALID_DOCUMENT" : "INVALID_MANIFEST",
      `Invalid JSON in ${path}`,
      { entryPath: path, cause },
    );
  }
}

export function validateNativeDocument(bytes: Uint8Array): {
  readonly json: string;
  readonly document: EditxDocumentV1;
} {
  let json: string;
  let payload: unknown;
  try {
    json = decoder.decode(bytes);
    payload = JSON.parse(json);
    if (!record(payload)) throw new TypeError("Document must be a JSON object");
    const document = validateDocument(payload);
    return { json, document };
  } catch (cause) {
    throw new EditxArchiveError("INVALID_DOCUMENT", "Archive document is not native schema 1", {
      entryPath: EDITX_ARCHIVE_PATHS.document,
      cause,
    });
  }
}

export function validateRootManifest(
  payload: unknown,
  entries: ReadonlyMap<string, Uint8Array>,
): EditxArchiveManifestV1 {
  if (record(payload) && payload.kind === EDITX_ARCHIVE_KIND) {
    if (payload.schemaVersion !== EDITX_ARCHIVE_SCHEMA_VERSION) {
      throw new EditxArchiveError("UNSUPPORTED_VERSION", "Unsupported archive schema version", {
        entryPath: EDITX_ARCHIVE_PATHS.manifest,
      });
    }
  }
  if (!record(payload) || !record(payload.members)) {
    throw new EditxArchiveError("INVALID_MANIFEST", "Invalid archive manifest");
  }
  const preview = Object.getOwnPropertyDescriptor(payload.members, "preview") !== undefined;
  const expected: EditxArchiveManifestV1 = {
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
  if (!jsonEqual(payload, expected)) {
    throw new EditxArchiveError("INVALID_MANIFEST", "Archive manifest does not match v1 layout", {
      entryPath: EDITX_ARCHIVE_PATHS.manifest,
    });
  }
  for (const path of requiredPaths) {
    if (!entries.has(path)) {
      throw new EditxArchiveError("MISSING_MEMBER", `Missing archive member: ${path}`, {
        entryPath: path,
      });
    }
  }
  if (entries.has(EDITX_ARCHIVE_PATHS.preview) !== preview) {
    throw new EditxArchiveError(
      preview ? "MISSING_MEMBER" : "INVALID_MANIFEST",
      preview ? "Declared preview is missing" : "Preview is not declared by manifest",
      { entryPath: EDITX_ARCHIVE_PATHS.preview },
    );
  }
  return expected;
}

export function jsonEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonEqual(value, right[index]))
    );
  }
  if (!record(left) || !record(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && jsonEqual(left[key], right[key]))
  );
}

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10] as const;

export function validatePng(bytes: Uint8Array): void {
  if (
    bytes.length < pngSignature.length ||
    pngSignature.some((value, index) => bytes[index] !== value)
  ) {
    throw new EditxArchiveError("INVALID_PREVIEW", "Preview is not a PNG", {
      entryPath: EDITX_ARCHIVE_PATHS.preview,
    });
  }
}
