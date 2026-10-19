import Konva from "konva";
import type { BlockData } from "../block/block.types";
import type { ExportOptions } from "../editor-types";
import { normalizePageExportOptions } from "../editx-engine-export";
import { PageExportError } from "../page-export-error";
import { capturePageExport, type PageExportSnapshot } from "../page-export-snapshot";
import { preparePageAssets, visiblePageBlocks, waitForPageNodes } from "./konva-export-page-assets";
import { KonvaNodeFactory } from "./konva-node-factory";

export async function exportPage(
  pageId: number,
  resolveBlock: (id: number) => BlockData | undefined,
  options: ExportOptions,
): Promise<Blob> {
  const normalized = normalizePageExportOptions(options);
  let stage: Konva.Stage | undefined;
  try {
    const snapshot = capturePageExport(pageId, resolveBlock);
    await preparePageAssets(snapshot);
    stage = new Konva.Stage({
      container: document.createElement("div"),
      width: snapshot.width,
      height: snapshot.height,
    });
    const layer = new Konva.Layer({ listening: false });
    stage.add(layer);
    const root = buildPage(stage, layer, snapshot);
    await waitForPageNodes(pageId, root);
    layer.draw();
    const canvas = layer.toCanvas({
      x: 0,
      y: 0,
      width: snapshot.width,
      height: snapshot.height,
      pixelRatio: normalized.pixelRatio,
    });
    if (canvas.width === 0 || canvas.height === 0)
      throw new Error("Export dimensions produce an empty canvas");
    return await encodePage(canvas, normalized);
  } catch (cause) {
    if (cause instanceof PageExportError) throw cause;
    throw new PageExportError(
      "RENDER_FAILED",
      pageId,
      cause instanceof Error ? cause.message : "rendering failed",
      { cause },
    );
  } finally {
    stage?.destroy();
  }
}

function buildPage(
  stage: Konva.Stage,
  layer: Konva.Layer,
  snapshot: PageExportSnapshot,
): Konva.Group {
  const factory = new KonvaNodeFactory(stage, null);
  const resolveBlock = (id: number) => snapshot.blocks.get(id);
  const visible = new Set(visiblePageBlocks(snapshot).map((block) => block.id));
  const callbacks = { onDragEnd: () => {}, onTransformEnd: () => {} };
  const add = (block: BlockData, parent: Konva.Container): Konva.Node | null => {
    if (block.id !== snapshot.page.id && !visible.has(block.id)) return null;
    if (["scene", "shape", "fill", "effect"].includes(block.type)) return null;
    const node = factory.createNode(block.id, block, callbacks, resolveBlock);
    if (!node) throw new Error(`No renderer for page block ${block.id}`);
    parent.add(node);
    if (!visible.has(block.id)) {
      node.visible(false);
      return node;
    }
    factory.updateNode(node, block, resolveBlock);
    node.listening(false);
    node.draggable(false);
    if (node instanceof Konva.Group) {
      if (block.type === "page")
        node.clip({ x: 0, y: 0, width: snapshot.width, height: snapshot.height });
      for (const childId of block.children) add(snapshot.blocks.get(childId)!, node);
    } else if (block.children.length > 0) {
      throw new Error(`Non-container block ${block.id} owns children`);
    }
    return node;
  };
  const root = add(snapshot.page, layer);
  if (!(root instanceof Konva.Group)) throw new Error("Page export root is not a group");
  return root;
}

function encodePage(
  canvas: HTMLCanvasElement,
  options: Readonly<Required<ExportOptions>>,
): Promise<Blob> {
  const mime = `image/${options.format}`;
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error(`Page export produced no ${mime} data`));
        else if (blob.type !== mime)
          reject(new Error(`Page export encoder does not support ${mime}; received ${blob.type}`));
        else resolve(blob);
      },
      mime,
      options.format === "png" ? undefined : options.quality,
    );
  });
}
