import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import {
  createEditxArchive,
  EDITX_ARCHIVE_LIMITS,
  EDITX_ARCHIVE_PATHS,
  EditxArchiveError,
  readEditxArchive,
} from "./index";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
const fixedZip = { mtime: new Date(1980, 0, 1), attrs: 0, os: 0 } as const;

function nativeDocument(): string {
  return JSON.stringify({
    kind: "editx-document",
    schemaVersion: 1,
    id: "archive-test",
    metadata: {},
    scene: { rootSceneId: null, blocks: [] },
  });
}

function signature(bytes: Uint8Array, value: readonly number[]): number {
  for (let offset = 0; offset <= bytes.length - value.length; offset++) {
    if (value.every((byte, index) => bytes[offset + index] === byte)) return offset;
  }
  throw new Error("signature not found");
}

function crafted(entries: Record<string, Uint8Array>): Uint8Array {
  const files = Object.fromEntries(
    Object.entries(entries).map(([path, bytes]) => [path, [bytes, fixedZip]]),
  );
  return zipSync(files);
}

describe("editx archive codec", () => {
  it("publishes fixed immutable security limits and enforces input/document caps", () => {
    expect(EDITX_ARCHIVE_LIMITS).toEqual({
      archiveBytes: 32 * 1024 * 1024,
      aggregateUncompressedBytes: 64 * 1024 * 1024,
      entryCompressedBytes: 32 * 1024 * 1024,
      entryUncompressedBytes: 32 * 1024 * 1024,
      documentBytes: 16 * 1024 * 1024,
      manifestBytes: 1024 * 1024,
      entryCount: 64,
      pathUtf8Bytes: 240,
    });
    expect(Object.isFrozen(EDITX_ARCHIVE_LIMITS)).toBe(true);
    expect(() =>
      readEditxArchive(new Uint8Array(EDITX_ARCHIVE_LIMITS.archiveBytes + 1)),
    ).toThrowError(expect.objectContaining({ code: "LIMIT_EXCEEDED", limit: "archiveBytes" }));
    expect(() =>
      createEditxArchive({
        documentJson: " ".repeat(EDITX_ARCHIVE_LIMITS.documentBytes + 1),
      }),
    ).toThrowError(expect.objectContaining({ code: "LIMIT_EXCEEDED", limit: "documentBytes" }));
  });

  it("writes deterministic fixed layout with deflated JSON and stored PNG", () => {
    const input = { documentJson: nativeDocument(), preview: png };
    const first = createEditxArchive(input);
    const second = createEditxArchive(input);
    expect(first).toEqual(second);

    const entries = unzipSync(first);
    expect(Object.keys(entries)).toEqual([
      "manifest.json",
      "document.json",
      "assets/manifest.json",
      "fonts/manifest.json",
      "previews/preview.png",
    ]);
    expect(entries[EDITX_ARCHIVE_PATHS.document]).toEqual(
      new TextEncoder().encode(input.documentJson),
    );
    expect(entries[EDITX_ARCHIVE_PATHS.preview]).toEqual(png);
    expect(first[8]).toBe(8);
    const previewHeader = signature(first, new TextEncoder().encode("previews/preview.png")) - 30;
    expect(first[previewHeader + 8]).toBe(0);
  });

  it("round-trips native JSON and returns an owned preview", () => {
    const archive = createEditxArchive({ documentJson: nativeDocument(), preview: png });
    const result = readEditxArchive(archive);
    expect(result.documentJson).toBe(nativeDocument());
    expect(result.manifest).toEqual({
      kind: "editx-archive",
      schemaVersion: 1,
      selfContained: false,
      members: {
        document: "document.json",
        assetsManifest: "assets/manifest.json",
        fontsManifest: "fonts/manifest.json",
        preview: "previews/preview.png",
      },
    });
    expect(Object.isFrozen(result.manifest.members)).toBe(true);
    expect(Object.isFrozen(result.assets.dependencies)).toBe(true);
    result.preview![0] = 0;
    expect(readEditxArchive(archive).preview![0]).toBe(137);
  });

  it("rejects legacy raw scenes in archives while raw loading remains compatible", async () => {
    const legacy = JSON.stringify({
      version: 2,
      blocks: [],
      activeSceneId: null,
      activePageId: null,
    });
    expect(() => createEditxArchive({ documentJson: legacy })).toThrowError(
      expect.objectContaining({ code: "INVALID_DOCUMENT" }),
    );
    await expect(new EditxEngine().document.loadFromString(legacy)).resolves.toBeUndefined();
  });

  it.each([
    ["unknown members", { "unknown.txt": new Uint8Array() }, "UNKNOWN_MEMBER"],
    ["traversal", { "../manifest.json": new Uint8Array() }, "UNSAFE_PATH"],
    ["backslashes", { "assets\\manifest.json": new Uint8Array() }, "UNSAFE_PATH"],
    [
      "case-fold aliases",
      { "manifest.json": new Uint8Array(), "MANIFEST.JSON": new Uint8Array() },
      "DUPLICATE_PATH",
    ],
    ["overlong paths", { [`${"a".repeat(241)}`]: new Uint8Array() }, "LIMIT_EXCEEDED"],
  ])("rejects %s during structural preflight", (_label, entries, code) => {
    expect(() => readEditxArchive(crafted(entries))).toThrowError(
      expect.objectContaining({ code }),
    );
  });

  it("rejects unsupported flags, methods, and CRC corruption", () => {
    const archive = createEditxArchive({ documentJson: nativeDocument() });
    const central = signature(archive, [0x50, 0x4b, 0x01, 0x02]);

    const encrypted = archive.slice();
    encrypted[6] = 1;
    encrypted[central + 8] = 1;
    expect(() => readEditxArchive(encrypted)).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_FEATURE" }),
    );

    const descriptor = archive.slice();
    descriptor[6] = 8;
    descriptor[central + 8] = 8;
    expect(() => readEditxArchive(descriptor)).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_FEATURE" }),
    );

    const method = archive.slice();
    method[8] = 99;
    method[central + 10] = 99;
    expect(() => readEditxArchive(method)).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_COMPRESSION" }),
    );

    const corrupt = archive.slice();
    corrupt[30 + "manifest.json".length] ^= 1;
    expect(() => readEditxArchive(corrupt)).toThrowError(
      expect.objectContaining({ code: "INTEGRITY_CHECK_FAILED" }),
    );
  });

  it("bounds actual inflation when declared sizes lie", () => {
    const archive = createEditxArchive({ documentJson: nativeDocument() });
    const central = signature(archive, [0x50, 0x4b, 0x01, 0x02]);
    const lying = archive.slice();
    for (const offset of [22, central + 24]) {
      lying[offset] = 1;
      lying[offset + 1] = 0;
      lying[offset + 2] = 0;
      lying[offset + 3] = 0;
    }
    expect(() => readEditxArchive(lying)).toThrowError(
      expect.objectContaining({ code: "LIMIT_EXCEEDED" }),
    );
  });

  it("validates PNG signatures", () => {
    expect(() =>
      createEditxArchive({ documentJson: nativeDocument(), preview: new Uint8Array([1, 2]) }),
    ).toThrowError(EditxArchiveError);
  });
});
