const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Derive a file extension from a blob's MIME type, defaulting to `png`. */
function extensionForBlob(blob: Blob): string {
  return MIME_EXTENSIONS[blob.type] ?? blob.type.split("/")[1] ?? "png";
}

/**
 * Trigger a browser download for an exported image blob.
 *
 * Used as the default `onSave` behavior when a consumer does not provide one,
 * so the built-in "Export" action saves a file out of the box. No-ops in
 * non-DOM environments (SSR).
 *
 * @param blob     The exported image blob.
 * @param filename Base name without extension. The extension is derived from
 *                 the blob's MIME type.
 */
export function downloadBlob(blob: Blob, filename = "edited"): void {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${extensionForBlob(blob)}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the download isn't cancelled in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
