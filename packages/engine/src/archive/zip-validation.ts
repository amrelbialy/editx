import { EditxArchiveError } from "./archive-error";
import { EDITX_ARCHIVE_LIMITS } from "./archive-limits";
import { EDITX_ARCHIVE_PATHS } from "./archive-types";

const decoder = new TextDecoder("utf-8", { fatal: true });

export function invalid(message: string, entryPath?: string): never {
  throw new EditxArchiveError("INVALID_ARCHIVE", message, { entryPath });
}

export function u16(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 2 > bytes.length) invalid("Truncated ZIP structure");
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

export function u32(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 4 > bytes.length) invalid("Truncated ZIP structure");
  return (
    (bytes[offset]! |
      (bytes[offset + 1]! << 8) |
      (bytes[offset + 2]! << 16) |
      (bytes[offset + 3]! << 24)) >>>
    0
  );
}

export function checkedEnd(offset: number, size: number, bound: number): number {
  const end = offset + size;
  if (!Number.isSafeInteger(end) || offset < 0 || size < 0 || end > bound) {
    invalid("ZIP structure points outside the archive");
  }
  return end;
}

export function readPath(bytes: Uint8Array, start: number, length: number): string {
  if (length > EDITX_ARCHIVE_LIMITS.pathUtf8Bytes) {
    throw new EditxArchiveError("LIMIT_EXCEEDED", "ZIP entry path exceeds its byte limit", {
      limit: "pathUtf8Bytes",
    });
  }
  try {
    return decoder.decode(bytes.subarray(start, checkedEnd(start, length, bytes.length)));
  } catch (cause) {
    throw new EditxArchiveError("UNSAFE_PATH", "ZIP entry path is not valid UTF-8", { cause });
  }
}

function hasControlCharacters(path: string): boolean {
  for (const character of path) {
    const code = character.codePointAt(0)!;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

export function validatePath(path: string): void {
  const segments = path.split("/");
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    /^[A-Za-z]:/.test(path) ||
    path.includes("\\") ||
    hasControlCharacters(path) ||
    segments.some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new EditxArchiveError("UNSAFE_PATH", `Unsafe ZIP entry path: ${path}`, {
      entryPath: path,
    });
  }
}

export function checkExtra(bytes: Uint8Array, start: number, length: number, path: string): void {
  const end = checkedEnd(start, length, bytes.length);
  let cursor = start;
  while (cursor < end) {
    if (cursor + 4 > end) invalid("Malformed ZIP extra field", path);
    const id = u16(bytes, cursor);
    const size = u16(bytes, cursor + 2);
    cursor = checkedEnd(cursor + 4, size, end);
    if (id === 1) {
      throw new EditxArchiveError("UNSUPPORTED_FEATURE", "ZIP64 is not supported", {
        entryPath: path,
      });
    }
  }
}

export function checkFlags(flags: number, path: string): void {
  if ((flags & 1) !== 0) {
    throw new EditxArchiveError("UNSUPPORTED_FEATURE", "Encrypted ZIP entries are unsupported", {
      entryPath: path,
    });
  }
  if ((flags & ~0x0800) !== 0) {
    throw new EditxArchiveError(
      "UNSUPPORTED_FEATURE",
      "ZIP data descriptors and extended flags are unsupported",
      { entryPath: path },
    );
  }
}

export function checkEntryLimits(path: string, compressed: number, uncompressed: number): void {
  const limits = EDITX_ARCHIVE_LIMITS;
  if (compressed > limits.entryCompressedBytes) {
    throw new EditxArchiveError("LIMIT_EXCEEDED", "Compressed ZIP entry exceeds its limit", {
      entryPath: path,
      limit: "entryCompressedBytes",
    });
  }
  if (uncompressed > limits.entryUncompressedBytes) {
    throw new EditxArchiveError("LIMIT_EXCEEDED", "Uncompressed ZIP entry exceeds its limit", {
      entryPath: path,
      limit: "entryUncompressedBytes",
    });
  }
  const special =
    path === EDITX_ARCHIVE_PATHS.document
      ? (["documentBytes", limits.documentBytes] as const)
      : path.endsWith("manifest.json")
        ? (["manifestBytes", limits.manifestBytes] as const)
        : undefined;
  if (special && uncompressed > special[1]) {
    throw new EditxArchiveError("LIMIT_EXCEEDED", `${path} exceeds its limit`, {
      entryPath: path,
      limit: special[0],
    });
  }
}

export function checkRegularFile(versionMade: number, external: number, path: string): void {
  const os = versionMade >>> 8;
  const unixType = (external >>> 16) & 0xf000;
  if ((external & 0x18) !== 0 || (os === 3 && unixType !== 0 && unixType !== 0x8000)) {
    throw new EditxArchiveError("UNSUPPORTED_FEATURE", "Non-regular ZIP entry", {
      entryPath: path,
    });
  }
}
