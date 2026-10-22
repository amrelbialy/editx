import { type Zippable, zipSync } from "fflate";
import { EditxArchiveError } from "./archive-error";
import { EDITX_ARCHIVE_LIMITS } from "./archive-limits";
import { inflateZipEntries } from "./zip-inflate";
import { preflightZip } from "./zip-structures";

export interface ArchiveWriteEntry {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly store: boolean;
}

const fixedTime = new Date(1980, 0, 1, 0, 0, 0);

export function writeArchiveZip(entries: readonly ArchiveWriteEntry[]): Uint8Array {
  const input: Zippable = {};
  for (const entry of entries) {
    input[entry.path] = [
      entry.bytes,
      {
        level: entry.store ? 0 : 6,
        mtime: fixedTime,
        attrs: 0,
        os: 0,
      },
    ];
  }
  const output = zipSync(input, { level: 6, mtime: fixedTime, attrs: 0, os: 0 });
  if (output.length > EDITX_ARCHIVE_LIMITS.archiveBytes) {
    throw new EditxArchiveError("LIMIT_EXCEEDED", "Created archive exceeds its byte limit", {
      limit: "archiveBytes",
    });
  }
  return output;
}

export function readArchiveZip(bytes: Uint8Array): ReadonlyMap<string, Uint8Array> {
  if (!(bytes instanceof Uint8Array)) {
    throw new EditxArchiveError("INVALID_ARCHIVE", "Archive input must be a Uint8Array");
  }
  try {
    return inflateZipEntries(bytes, preflightZip(bytes));
  } catch (cause) {
    if (cause instanceof EditxArchiveError) throw cause;
    throw new EditxArchiveError("INVALID_ARCHIVE", "Malformed ZIP archive", { cause });
  }
}
