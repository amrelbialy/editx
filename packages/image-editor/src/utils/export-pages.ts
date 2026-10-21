import type { EditxEngine, ExportOptions } from "@editx/engine";
import { zipSync } from "fflate";
import { watchExportDocument } from "./export-document-guard";

export type PageExportTarget =
  | { mode: "current" }
  | { mode: "selected"; ids: readonly number[] }
  | { mode: "all" };

function pageFilename(name: string, index: number, count: number, extension: string): string {
  const prefix = String(index + 1).padStart(Math.max(2, String(count).length), "0");
  const safeName = name
    .replace(/[<>:"/\\|?*]|\p{Cc}/gu, "-")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 100);
  return `${prefix}-${safeName || "page"}.${extension}`;
}

export async function exportPages(
  engine: EditxEngine,
  target: PageExportTarget,
  options: ExportOptions,
): Promise<Blob> {
  const guard = watchExportDocument(engine);
  try {
    if (target.mode === "current") {
      const id = engine.scene.getCurrentPage();
      if (id === null) throw new Error("There is no current page to export.");
      const blob = await engine.exportPage(id, options);
      guard.assertCurrent();
      return blob;
    }

    const pages = engine.scene.getPages();
    const requested = target.mode === "selected" ? new Set(target.ids) : new Set(pages);
    if (requested.size === 0) throw new Error("Select at least one page to export.");
    for (const id of requested) {
      if (!pages.includes(id)) throw new Error(`Page ${id} no longer exists. Choose pages again.`);
    }
    const extension = options.format === "jpeg" ? "jpg" : (options.format ?? "png");
    const targets = pages.flatMap((id, index) =>
      requested.has(id)
        ? [
            {
              id,
              filename: pageFilename(
                engine.scene.getPageProperties(id).name,
                index,
                pages.length,
                extension,
              ),
            },
          ]
        : [],
    );
    const files: Record<string, Uint8Array> = {};
    for (const { id, filename } of targets) {
      guard.assertCurrent();
      const blob = await engine.exportPage(id, options);
      files[filename] = new Uint8Array(await blob.arrayBuffer());
      guard.assertCurrent();
    }
    const archive = new Uint8Array(zipSync(files, { level: 0 }));
    return new Blob([archive], { type: "application/zip" });
  } finally {
    guard.dispose();
  }
}
