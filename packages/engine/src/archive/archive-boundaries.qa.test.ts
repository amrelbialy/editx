import { deflateSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  nativeDocument,
  png,
  utf8,
  validEntries,
  zipEntries,
} from "../__tests__/archive-qa-fixtures";
import { crc32 } from "./archive-crc32";
import { createEditxArchive, EDITX_ARCHIVE_LIMITS, readEditxArchive } from "./index";
import { inflateZipEntries } from "./zip-inflate";
import type { ZipEntry } from "./zip-structures";
import { checkEntryLimits } from "./zip-validation";

const limits = EDITX_ARCHIVE_LIMITS;

function expectLimit(run: () => unknown, limit: keyof typeof limits): void {
  expect(run).toThrowError(expect.objectContaining({ code: "LIMIT_EXCEEDED", limit }));
}

function deflatedEntry(
  path: string,
  compressedSize: number,
  uncompressedSize: number,
  checksum: number,
  dataOffset = 0,
): ZipEntry {
  return {
    path,
    method: 8,
    crc: checksum,
    compressedSize,
    uncompressedSize,
    dataOffset,
    dataEnd: dataOffset + compressedSize,
    localOffset: 0,
  };
}

describe("archive exact security boundaries", () => {
  it("accepts an archive of exactly 32 MiB and rejects one byte more", () => {
    const probe = createEditxArchive({ documentJson: nativeDocument(), preview: png() });
    const overhead = probe.length - 8;
    const exactPreview = png(limits.archiveBytes - overhead);
    const exact = createEditxArchive({ documentJson: nativeDocument(), preview: exactPreview });

    expect(exact).toHaveLength(limits.archiveBytes);
    expect(readEditxArchive(exact).preview).toHaveLength(exactPreview.length);
    expectLimit(
      () =>
        createEditxArchive({
          documentJson: nativeDocument(),
          preview: png(exactPreview.length + 1),
        }),
      "archiveBytes",
    );
  }, 20_000);

  it("accepts document and manifest UTF-8 sizes at their caps", () => {
    const base = nativeDocument();
    const exactDocument = base + " ".repeat(limits.documentBytes - utf8(base).length);
    expect(readEditxArchive(createEditxArchive({ documentJson: exactDocument })).documentJson).toBe(
      exactDocument,
    );
    expectLimit(() => createEditxArchive({ documentJson: `${exactDocument} ` }), "documentBytes");

    const entries = validEntries();
    const manifest = entries["manifest.json"]!;
    entries["manifest.json"] = new Uint8Array(limits.manifestBytes).fill(0x20);
    entries["manifest.json"]!.set(manifest);
    expect(readEditxArchive(zipEntries(entries)).manifest.schemaVersion).toBe(1);
    entries["manifest.json"] = new Uint8Array(limits.manifestBytes + 1).fill(0x20);
    entries["manifest.json"]!.set(manifest);
    expectLimit(() => readEditxArchive(zipEntries(entries)), "manifestBytes");
  }, 20_000);

  it("enforces exact per-entry compressed and uncompressed gates", () => {
    expect(() =>
      checkEntryLimits("previews/preview.png", limits.entryCompressedBytes, 8),
    ).not.toThrow();
    expectLimit(
      () => checkEntryLimits("previews/preview.png", limits.entryCompressedBytes + 1, 8),
      "entryCompressedBytes",
    );
    expect(() =>
      checkEntryLimits("previews/preview.png", 8, limits.entryUncompressedBytes),
    ).not.toThrow();
    expectLimit(
      () => checkEntryLimits("previews/preview.png", 8, limits.entryUncompressedBytes + 1),
      "entryUncompressedBytes",
    );
  });

  it("accepts actual aggregate inflation at 64 MiB and rejects byte 64 MiB + 1", () => {
    const uncompressed = new Uint8Array(limits.entryUncompressedBytes);
    const compressed = deflateSync(uncompressed, { level: 9 });
    const checksum = crc32(uncompressed);
    const entryA = deflatedEntry("a", compressed.length, uncompressed.length, checksum);
    const entryB = deflatedEntry("b", compressed.length, uncompressed.length, checksum);
    const exact = inflateZipEntries(compressed, [entryA, entryB]);
    expect(exact.get("a")).toHaveLength(limits.entryUncompressedBytes);
    expect(exact.get("b")).toHaveLength(limits.entryUncompressedBytes);

    const one = deflateSync(new Uint8Array(1));
    const archive = new Uint8Array(compressed.length + one.length);
    archive.set(compressed);
    archive.set(one, compressed.length);
    const extra = deflatedEntry("c", one.length, 1, crc32(new Uint8Array(1)), compressed.length);
    expectLimit(
      () => inflateZipEntries(archive, [entryA, entryB, extra]),
      "aggregateUncompressedBytes",
    );
  }, 20_000);

  it("distinguishes unreachable public entry-count and UTF-8 path gates", () => {
    const atCount = Object.fromEntries(
      Array.from({ length: limits.entryCount }, (_, index) => [`x${index}`, new Uint8Array()]),
    );
    expect(() => readEditxArchive(zipEntries(atCount))).toThrowError(
      expect.objectContaining({ code: "UNKNOWN_MEMBER" }),
    );
    atCount.extra = new Uint8Array();
    expectLimit(() => readEditxArchive(zipEntries(atCount)), "entryCount");

    expect(() =>
      readEditxArchive(zipEntries({ ["a".repeat(240)]: new Uint8Array() })),
    ).toThrowError(expect.objectContaining({ code: "UNKNOWN_MEMBER" }));
    expectLimit(
      () => readEditxArchive(zipEntries({ ["a".repeat(241)]: new Uint8Array() })),
      "pathUtf8Bytes",
    );
  });
});
