import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  declarePreview,
  headersFor,
  patchCompressedSize,
  patchUncompressedSize,
  png,
  validEntries,
  writeU32,
  zipEntries,
} from "../__tests__/archive-qa-fixtures";
import { EDITX_ARCHIVE_LIMITS, EDITX_ARCHIVE_PATHS, readEditxArchive } from "./index";

function expectCode(run: () => unknown, code: string, entryPath?: string): void {
  expect(run).toThrowError(expect.objectContaining({ code, ...(entryPath ? { entryPath } : {}) }));
}

function u32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! |
      (bytes[offset + 1]! << 8) |
      (bytes[offset + 2]! << 16) |
      (bytes[offset + 3]! << 24)) >>>
    0
  );
}

describe("adversarial ZIP integrity", () => {
  it("bounds a real 32 MiB + 1 bomb whose headers claim exactly 32 MiB", () => {
    const entries = validEntries();
    declarePreview(entries);
    entries[EDITX_ARCHIVE_PATHS.preview] = png(EDITX_ARCHIVE_LIMITS.entryUncompressedBytes + 1);
    const bomb = patchUncompressedSize(
      zipEntries(entries),
      EDITX_ARCHIVE_PATHS.preview,
      EDITX_ARCHIVE_LIMITS.entryUncompressedBytes,
    );
    const started = performance.now();

    expect(() => readEditxArchive(bomb)).toThrowError(
      expect.objectContaining({
        code: "LIMIT_EXCEEDED",
        entryPath: EDITX_ARCHIVE_PATHS.preview,
        limit: "entryUncompressedBytes",
      }),
    );
    expect(performance.now() - started).toBeLessThan(5_000);
  }, 10_000);

  it("rejects matched bad CRC and local/central inconsistency", () => {
    const crcArchive = zipEntries(validEntries());
    const crcHeaders = headersFor(crcArchive, EDITX_ARCHIVE_PATHS.document);
    writeU32(crcArchive, crcHeaders.central + 16, 0);
    writeU32(crcArchive, crcHeaders.local + 14, 0);
    expectCode(
      () => readEditxArchive(crcArchive),
      "INTEGRITY_CHECK_FAILED",
      EDITX_ARCHIVE_PATHS.document,
    );

    const mismatch = zipEntries(validEntries());
    const mismatchHeaders = headersFor(mismatch, EDITX_ARCHIVE_PATHS.document);
    mismatch[mismatchHeaders.local + 10] ^= 1;
    expectCode(
      () => readEditxArchive(mismatch),
      "INTEGRITY_CHECK_FAILED",
      EDITX_ARCHIVE_PATHS.document,
    );
  });

  it("rejects overlapping entry extents before inflation", () => {
    const archive = zipEntries(validEntries());
    const manifest = headersFor(archive, EDITX_ARCHIVE_PATHS.manifest);
    const document = headersFor(archive, EDITX_ARCHIVE_PATHS.document);
    const originalSize =
      document.local - (manifest.local + 30 + EDITX_ARCHIVE_PATHS.manifest.length);
    const overlap = patchCompressedSize(archive, EDITX_ARCHIVE_PATHS.manifest, originalSize + 1);
    expectCode(
      () => readEditxArchive(overlap),
      "INTEGRITY_CHECK_FAILED",
      EDITX_ARCHIVE_PATHS.document,
    );
  });

  it("rejects an unlisted local-file record hidden before the central directory", () => {
    const archive = zipEntries(validEntries());
    const hiddenArchive = zipEntries({ "hidden.bin": new Uint8Array([1, 2, 3]) });
    const archiveEocd = archive.length - 22;
    const hiddenEocd = hiddenArchive.length - 22;
    const centralOffset = u32(archive, archiveEocd + 16);
    const hiddenLocal = hiddenArchive.subarray(0, u32(hiddenArchive, hiddenEocd + 16));
    const polyglot = new Uint8Array(archive.length + hiddenLocal.length);
    polyglot.set(archive.subarray(0, centralOffset));
    polyglot.set(hiddenLocal, centralOffset);
    polyglot.set(archive.subarray(centralOffset), centralOffset + hiddenLocal.length);
    writeU32(polyglot, archiveEocd + hiddenLocal.length + 16, centralOffset + hiddenLocal.length);

    expectCode(() => readEditxArchive(polyglot), "INVALID_ARCHIVE");
  });

  it("rejects per-entry ZIP comments in the strict profile", () => {
    const entries = validEntries();
    const archive = zipSync(
      {
        ...entries,
        [EDITX_ARCHIVE_PATHS.manifest]: [
          entries[EDITX_ARCHIVE_PATHS.manifest]!,
          { comment: "forbidden" },
        ],
      },
      { mtime: new Date(1980, 0, 1), attrs: 0, os: 0, level: 9 },
    );

    expectCode(
      () => readEditxArchive(archive),
      "UNSUPPORTED_FEATURE",
      EDITX_ARCHIVE_PATHS.manifest,
    );
  });

  it("rejects Unicode-fold aliases and Unix symlinks", () => {
    expectCode(
      () =>
        readEditxArchive(
          zipEntries({
            "manifest.json": new Uint8Array(),
            "ｍanifest.json": new Uint8Array(),
          }),
        ),
      "DUPLICATE_PATH",
      "ｍanifest.json",
    );

    const symlink = zipEntries(validEntries());
    const { central } = headersFor(symlink, EDITX_ARCHIVE_PATHS.document);
    symlink[central + 5] = 3;
    writeU32(symlink, central + 38, 0xa000 << 16);
    expectCode(
      () => readEditxArchive(symlink),
      "UNSUPPORTED_FEATURE",
      EDITX_ARCHIVE_PATHS.document,
    );
  });

  it("rejects undeclared preview and mismatched dependency inventory", () => {
    const undeclared = validEntries();
    undeclared[EDITX_ARCHIVE_PATHS.preview] = png();
    expectCode(
      () => readEditxArchive(zipEntries(undeclared)),
      "INVALID_MANIFEST",
      EDITX_ARCHIVE_PATHS.preview,
    );

    const mismatch = validEntries();
    mismatch[EDITX_ARCHIVE_PATHS.assetsManifest] = new TextEncoder().encode(
      JSON.stringify({
        kind: "editx-assets-manifest",
        schemaVersion: 1,
        dependencies: [{ unexpected: true }],
      }),
    );
    expectCode(
      () => readEditxArchive(zipEntries(mismatch)),
      "INVALID_MANIFEST",
      EDITX_ARCHIVE_PATHS.assetsManifest,
    );
  });
});
