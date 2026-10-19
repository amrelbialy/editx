import Konva from "konva";
import type { BlockData } from "../block/block.types";
import { FILL_ENABLED, FILL_IMAGE_SRC, IMAGE_SRC, OPACITY, VISIBLE } from "../block/property-keys";
import { PageExportError } from "../page-export-error";
import type { PageExportSnapshot } from "../page-export-snapshot";
import { loadImage } from "../utils/image-loader";
import { applyTextTransform, formatFont, resolveStyle } from "./formatted-text-utils";
import { resolveTextRuns } from "./konva-text-updater";

export function visiblePageBlocks(snapshot: PageExportSnapshot): BlockData[] {
  const blocks: BlockData[] = [];
  const visit = (block: BlockData): void => {
    if (block.properties[VISIBLE] === false || block.properties[OPACITY] === 0) return;
    blocks.push(block);
    for (const childId of block.children) visit(snapshot.blocks.get(childId)!);
  };
  visit(snapshot.page);
  return blocks;
}

export async function preparePageAssets(snapshot: PageExportSnapshot): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const block of visiblePageBlocks(snapshot)) {
    if (block.type === "page" || block.type === "image") {
      const src = block.properties[IMAGE_SRC];
      if (src || block.type === "image") jobs.push(prepareImage(snapshot.page.id, block.id, src));
    }
    if (
      block.type === "graphic" &&
      block.fillId !== null &&
      block.properties[FILL_ENABLED] !== false
    ) {
      const fill = snapshot.blocks.get(block.fillId)!;
      if (fill.kind === "image")
        jobs.push(prepareImage(snapshot.page.id, block.id, fill.properties[FILL_IMAGE_SRC]));
    }
    if (block.type === "text") {
      for (const run of resolveTextRuns(block.properties)) {
        if (!run.text) continue;
        const style = resolveStyle(run.style);
        jobs.push(
          prepareFont(
            snapshot.page.id,
            block.id,
            formatFont(style),
            style.fontFamily,
            applyTextTransform(run.text, style.textTransform),
          ),
        );
      }
    }
  }
  await Promise.all(jobs);
}

async function prepareImage(pageId: number, blockId: number, src: unknown): Promise<void> {
  try {
    if (typeof src !== "string" || !src) throw new Error("Image source is missing");
    const image = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas is unavailable");
    context.drawImage(image, 0, 0, 1, 1);
    context.getImageData(0, 0, 1, 1);
  } catch (cause) {
    throw new PageExportError(
      "IMAGE_LOAD_FAILED",
      pageId,
      `image on block ${blockId} could not be loaded or exported: ${src ?? "(missing source)"}`,
      { blockId, resource: typeof src === "string" ? src : undefined, cause },
    );
  }
}

async function prepareFont(
  pageId: number,
  blockId: number,
  font: string,
  family: string,
  text: string,
): Promise<void> {
  try {
    if (!document.fonts) throw new Error("Font loading API is unavailable");
    await document.fonts.load(font, text);
    if (!document.fonts.check(font, text)) throw new Error("Font did not become ready");
  } catch (cause) {
    throw new PageExportError(
      "FONT_LOAD_FAILED",
      pageId,
      `font on block ${blockId} could not be loaded: ${family}`,
      { blockId, resource: family, cause },
    );
  }
}

export async function waitForPageNodes(pageId: number, root: Konva.Node): Promise<void> {
  const jobs: Promise<void>[] = [];
  const visit = (node: Konva.Node, ownerId: number): void => {
    const blockId = node.getAttr("blockId") ?? ownerId;
    jobs.push(
      (async () => {
        await node.getAttr("__imageReady");
        await node.getAttr("__fillImageReady");
        const cause = node.getAttr("__imageLoadError") ?? node.getAttr("__fillImageLoadError");
        if (cause) {
          const resource = node.getAttr("__pendingSrc") ?? node.getAttr("__pendingFillSrc");
          throw new PageExportError(
            "IMAGE_LOAD_FAILED",
            pageId,
            `image processing failed on block ${blockId}: ${resource}`,
            { blockId, resource, cause },
          );
        }
      })(),
    );
    if (node instanceof Konva.Container) {
      for (const child of node.getChildren()) visit(child, blockId);
    }
  };
  visit(root, pageId);
  await Promise.all(jobs);
}
