import { Inflate } from "fflate";
import { crc32 } from "./archive-crc32";
import { EditxArchiveError } from "./archive-error";
import { EDITX_ARCHIVE_LIMITS } from "./archive-limits";
import type { ZipEntry } from "./zip-structures";

const INPUT_CHUNK_BYTES = 4096;

function concatenate(chunks: readonly Uint8Array[], length: number): Uint8Array {
  if (chunks.length === 1 && chunks[0]?.length === length) return chunks[0].slice();
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function inflateEntry(
  archive: Uint8Array,
  entry: ZipEntry,
  aggregate: { value: number },
): Uint8Array {
  const compressed = archive.subarray(entry.dataOffset, entry.dataEnd);
  if (entry.method === 0) {
    aggregate.value += compressed.length;
    return compressed.slice();
  }

  const chunks: Uint8Array[] = [];
  let actual = 0;
  const stream = new Inflate((chunk) => {
    actual += chunk.length;
    if (actual > entry.uncompressedSize || actual > EDITX_ARCHIVE_LIMITS.entryUncompressedBytes) {
      throw new EditxArchiveError("LIMIT_EXCEEDED", "Inflated ZIP entry exceeds its limit", {
        entryPath: entry.path,
        limit: "entryUncompressedBytes",
      });
    }
    if (aggregate.value + actual > EDITX_ARCHIVE_LIMITS.aggregateUncompressedBytes) {
      throw new EditxArchiveError("LIMIT_EXCEEDED", "Inflated aggregate exceeds its limit", {
        entryPath: entry.path,
        limit: "aggregateUncompressedBytes",
      });
    }
    if (chunk.length > 0) chunks.push(chunk);
  });
  for (let offset = 0; offset < compressed.length; offset += INPUT_CHUNK_BYTES) {
    const end = Math.min(offset + INPUT_CHUNK_BYTES, compressed.length);
    stream.push(compressed.subarray(offset, end), end === compressed.length);
  }
  if (compressed.length === 0) stream.push(compressed, true);
  aggregate.value += actual;
  return concatenate(chunks, actual);
}

export function inflateZipEntries(
  archive: Uint8Array,
  entries: readonly ZipEntry[],
): ReadonlyMap<string, Uint8Array> {
  const output = new Map<string, Uint8Array>();
  const aggregate = { value: 0 };
  for (const entry of entries) {
    let bytes: Uint8Array;
    try {
      bytes = inflateEntry(archive, entry, aggregate);
    } catch (cause) {
      if (cause instanceof EditxArchiveError) throw cause;
      throw new EditxArchiveError("INTEGRITY_CHECK_FAILED", "ZIP inflation failed", {
        entryPath: entry.path,
        cause,
      });
    }
    if (bytes.length !== entry.uncompressedSize || crc32(bytes) !== entry.crc) {
      throw new EditxArchiveError("INTEGRITY_CHECK_FAILED", "ZIP size or CRC check failed", {
        entryPath: entry.path,
      });
    }
    output.set(entry.path, bytes);
  }
  return output;
}
