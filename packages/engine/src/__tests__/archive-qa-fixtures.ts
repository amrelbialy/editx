import { unzipSync, zipSync } from "fflate";
import { createEditxArchive } from "../archive/document-archive";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const fixedZip = { mtime: new Date(1980, 0, 1), attrs: 0, os: 0 } as const;

export function nativeDocument(): string {
  return JSON.stringify({
    kind: "editx-document",
    schemaVersion: 1,
    id: "archive-qa",
    metadata: {},
    scene: { rootSceneId: null, blocks: [] },
  });
}

export function png(length = 8): Uint8Array {
  const bytes = new Uint8Array(length);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  return bytes;
}

export function zipEntries(entries: Record<string, Uint8Array>): Uint8Array {
  return zipSync(entries, { ...fixedZip, level: 9 });
}

export function validEntries(preview = false): Record<string, Uint8Array> {
  return unzipSync(
    createEditxArchive({
      documentJson: nativeDocument(),
      ...(preview ? { preview: png() } : {}),
    }),
  );
}

function u16(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
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

export function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

export interface HeaderOffsets {
  readonly central: number;
  readonly local: number;
}

export function headersFor(bytes: Uint8Array, path: string): HeaderOffsets {
  for (let offset = 0; offset <= bytes.length - 46; offset++) {
    if (u32(bytes, offset) !== 0x02014b50) continue;
    const nameLength = u16(bytes, offset + 28);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name === path) return { central: offset, local: u32(bytes, offset + 42) };
  }
  throw new Error(`Missing central header for ${path}`);
}

export function patchUncompressedSize(archive: Uint8Array, path: string, size: number): Uint8Array {
  const output = archive.slice();
  const { central, local } = headersFor(output, path);
  writeU32(output, central + 24, size);
  writeU32(output, local + 22, size);
  return output;
}

export function patchCompressedSize(archive: Uint8Array, path: string, size: number): Uint8Array {
  const output = archive.slice();
  const { central, local } = headersFor(output, path);
  writeU32(output, central + 20, size);
  writeU32(output, local + 18, size);
  return output;
}

export function declarePreview(entries: Record<string, Uint8Array>): void {
  const manifest = JSON.parse(decoder.decode(entries["manifest.json"])) as {
    members: Record<string, string>;
  };
  manifest.members.preview = "previews/preview.png";
  entries["manifest.json"] = encoder.encode(JSON.stringify(manifest));
}

export function utf8(value: string): Uint8Array {
  return encoder.encode(value);
}
