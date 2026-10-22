import { EditxArchiveError } from "./archive-error";
import { EDITX_ARCHIVE_LIMITS } from "./archive-limits";
import { EDITX_ARCHIVE_PATHS } from "./archive-types";
import {
  checkEntryLimits,
  checkExtra,
  checkedEnd,
  checkFlags,
  checkRegularFile,
  invalid,
  readPath,
  u16,
  u32,
  validatePath,
} from "./zip-validation";

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
const members = new Set<string>(Object.values(EDITX_ARCHIVE_PATHS));

export interface ZipEntry {
  readonly path: string;
  readonly method: 0 | 8;
  readonly crc: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly dataOffset: number;
  readonly dataEnd: number;
  readonly localOffset: number;
}

function findDirectory(bytes: Uint8Array) {
  if (bytes.length < 22) invalid("ZIP end record is missing");
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minimum; offset--) {
    if (u32(bytes, offset) !== EOCD) continue;
    const commentLength = u16(bytes, offset + 20);
    if (offset + 22 + commentLength !== bytes.length) continue;
    if (commentLength !== 0) {
      throw new EditxArchiveError("UNSUPPORTED_FEATURE", "ZIP comments are not supported");
    }
    const disk = u16(bytes, offset + 4);
    const centralDisk = u16(bytes, offset + 6);
    const diskEntries = u16(bytes, offset + 8);
    const entries = u16(bytes, offset + 10);
    const centralSize = u32(bytes, offset + 12);
    const centralOffset = u32(bytes, offset + 16);
    if (disk !== 0 || centralDisk !== 0 || diskEntries !== entries) {
      throw new EditxArchiveError("UNSUPPORTED_FEATURE", "Multi-disk ZIP is not supported");
    }
    if (entries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
      throw new EditxArchiveError("UNSUPPORTED_FEATURE", "ZIP64 is not supported");
    }
    if (entries > EDITX_ARCHIVE_LIMITS.entryCount) {
      throw new EditxArchiveError("LIMIT_EXCEEDED", "ZIP entry count exceeds its limit", {
        limit: "entryCount",
      });
    }
    if (checkedEnd(centralOffset, centralSize, bytes.length) !== offset) {
      invalid("Invalid central directory bounds");
    }
    return { entries, centralOffset, centralEnd: offset };
  }
  invalid("ZIP end record is missing or malformed");
}

interface LocalExpected {
  path: string;
  versionNeeded: number;
  method: 0 | 8;
  flags: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
  nameBytes: Uint8Array;
  time: number;
  date: number;
}

function readLocal(bytes: Uint8Array, centralOffset: number, entry: LocalExpected): ZipEntry {
  const offset = entry.localOffset;
  if (u32(bytes, offset) !== LOCAL) invalid("Invalid local ZIP header", entry.path);
  const nameLength = u16(bytes, offset + 26);
  const extraLength = u16(bytes, offset + 28);
  const nameStart = offset + 30;
  const dataOffset = checkedEnd(nameStart, nameLength + extraLength, centralOffset);
  const dataEnd = checkedEnd(dataOffset, entry.compressedSize, centralOffset);
  const localName = bytes.subarray(nameStart, nameStart + nameLength);
  if (
    u16(bytes, offset + 4) !== entry.versionNeeded ||
    u16(bytes, offset + 6) !== entry.flags ||
    u16(bytes, offset + 8) !== entry.method ||
    u16(bytes, offset + 10) !== entry.time ||
    u16(bytes, offset + 12) !== entry.date ||
    u32(bytes, offset + 14) !== entry.crc ||
    u32(bytes, offset + 18) !== entry.compressedSize ||
    u32(bytes, offset + 22) !== entry.uncompressedSize ||
    localName.length !== entry.nameBytes.length ||
    localName.some((byte, index) => byte !== entry.nameBytes[index])
  ) {
    throw new EditxArchiveError("INTEGRITY_CHECK_FAILED", "Local and central ZIP headers differ", {
      entryPath: entry.path,
    });
  }
  checkExtra(bytes, nameStart + nameLength, extraLength, entry.path);
  return { ...entry, dataOffset, dataEnd };
}

function checkNonOverlapping(entries: readonly ZipEntry[], centralOffset: number): void {
  const sorted = [...entries].sort((left, right) => left.localOffset - right.localOffset);
  let expectedOffset = 0;
  for (const entry of sorted) {
    if (entry.localOffset < expectedOffset || entry.dataEnd > centralOffset) {
      throw new EditxArchiveError("INTEGRITY_CHECK_FAILED", "ZIP entries overlap", {
        entryPath: entry.path,
      });
    }
    if (entry.localOffset !== expectedOffset) {
      invalid("ZIP contains unaccounted bytes before a local entry", entry.path);
    }
    expectedOffset = entry.dataEnd;
  }
  if (expectedOffset !== centralOffset) {
    invalid("ZIP contains unaccounted bytes before the central directory");
  }
}

export function preflightZip(bytes: Uint8Array): readonly ZipEntry[] {
  if (bytes.length > EDITX_ARCHIVE_LIMITS.archiveBytes) {
    throw new EditxArchiveError("LIMIT_EXCEEDED", "Archive input exceeds its byte limit", {
      limit: "archiveBytes",
    });
  }
  const directory = findDirectory(bytes);
  const entries: ZipEntry[] = [];
  const paths = new Set<string>();
  const foldedPaths = new Set<string>();
  let cursor = directory.centralOffset;
  let aggregate = 0;

  for (let index = 0; index < directory.entries; index++) {
    if (u32(bytes, cursor) !== CENTRAL) invalid("Invalid central directory entry");
    const versionMade = u16(bytes, cursor + 4);
    const versionNeeded = u16(bytes, cursor + 6);
    const flags = u16(bytes, cursor + 8);
    const method = u16(bytes, cursor + 10);
    const crc = u32(bytes, cursor + 16);
    const compressedSize = u32(bytes, cursor + 20);
    const uncompressedSize = u32(bytes, cursor + 24);
    const nameLength = u16(bytes, cursor + 28);
    const extraLength = u16(bytes, cursor + 30);
    const commentLength = u16(bytes, cursor + 32);
    const disk = u16(bytes, cursor + 34);
    const external = u32(bytes, cursor + 38);
    const localOffset = u32(bytes, cursor + 42);
    const nameStart = cursor + 46;
    const path = readPath(bytes, nameStart, nameLength);
    if (commentLength !== 0) {
      throw new EditxArchiveError("UNSUPPORTED_FEATURE", "ZIP entry comments are not supported", {
        entryPath: path,
      });
    }
    const next = checkedEnd(
      nameStart,
      nameLength + extraLength + commentLength,
      directory.centralEnd,
    );
    validatePath(path);
    const folded = path.normalize("NFKC").toLowerCase();
    if (paths.has(path) || foldedPaths.has(folded)) {
      throw new EditxArchiveError("DUPLICATE_PATH", `Duplicate ZIP entry path: ${path}`, {
        entryPath: path,
      });
    }
    paths.add(path);
    foldedPaths.add(folded);
    if (!members.has(path)) {
      throw new EditxArchiveError("UNKNOWN_MEMBER", `Unknown archive member: ${path}`, {
        entryPath: path,
      });
    }
    if (disk !== 0 || versionNeeded >= 45) {
      throw new EditxArchiveError("UNSUPPORTED_FEATURE", "ZIP64 or multi-disk entry", {
        entryPath: path,
      });
    }
    checkFlags(flags, path);
    if (method !== 0 && method !== 8) {
      throw new EditxArchiveError("UNSUPPORTED_COMPRESSION", "Unsupported ZIP compression", {
        entryPath: path,
      });
    }
    if (method === 0 && compressedSize !== uncompressedSize) invalid("Invalid STORE sizes", path);
    checkRegularFile(versionMade, external, path);
    checkExtra(bytes, nameStart + nameLength, extraLength, path);
    checkEntryLimits(path, compressedSize, uncompressedSize);
    aggregate += uncompressedSize;
    if (aggregate > EDITX_ARCHIVE_LIMITS.aggregateUncompressedBytes) {
      throw new EditxArchiveError("LIMIT_EXCEEDED", "Aggregate ZIP size exceeds its limit", {
        limit: "aggregateUncompressedBytes",
      });
    }
    entries.push(
      readLocal(bytes, directory.centralOffset, {
        path,
        versionNeeded,
        method: method as 0 | 8,
        flags,
        crc,
        compressedSize,
        uncompressedSize,
        localOffset,
        nameBytes: bytes.subarray(nameStart, nameStart + nameLength),
        time: u16(bytes, cursor + 12),
        date: u16(bytes, cursor + 14),
      }),
    );
    cursor = next;
  }
  if (cursor !== directory.centralEnd) invalid("Central directory size does not match entries");
  checkNonOverlapping(entries, directory.centralOffset);
  return entries;
}
