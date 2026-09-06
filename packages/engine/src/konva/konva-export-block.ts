import Konva from "konva";
import type { BlockExportOptions } from "../editor-types";
import { FormattedText } from "./formatted-text";

export async function exportBlockNode(
  node: Konva.Node,
  contentLayer: Konva.Layer,
  options: BlockExportOptions,
): Promise<Blob> {
  await waitForBlockAssets(node);
  if (!node.isVisible() || node.getAbsoluteOpacity() <= 0) {
    throw new Error("Cannot export a hidden block");
  }

  const stageContainer = document.createElement("div");
  const stage = new Konva.Stage({
    container: stageContainer,
    width: options.width,
    height: options.height,
  });
  const layer = new Konva.Layer();
  const fitGroup = new Konva.Group();
  stage.add(layer);
  layer.add(fitGroup);

  try {
    const branch = cloneBranch(node, contentLayer);
    usePaintBoundsForExport(branch);
    fitGroup.add(branch);
    const bounds = fitGroup.getClientRect({ relativeTo: layer });
    if (!(bounds.width > 0) || !(bounds.height > 0)) {
      throw new Error("Cannot export a block with zero paint bounds");
    }

    const padding = options.padding ?? 0;
    const availableWidth = options.width - padding * 2;
    const availableHeight = options.height - padding * 2;
    const scale = Math.min(availableWidth / bounds.width, availableHeight / bounds.height);
    fitGroup.scale({ x: scale, y: scale });
    fitGroup.position({
      x: (options.width - bounds.width * scale) / 2 - bounds.x * scale,
      y: (options.height - bounds.height * scale) / 2 - bounds.y * scale,
    });
    layer.draw();

    const canvas = layer.toCanvas({
      x: 0,
      y: 0,
      width: options.width,
      height: options.height,
      pixelRatio: options.pixelRatio ?? 1,
    });
    return await canvasToPng(canvas);
  } finally {
    stage.destroy();
  }
}

function usePaintBoundsForExport(node: Konva.Node): void {
  if (node instanceof FormattedText) node.usePaintBoundsForExport();
  if (node instanceof Konva.Container) {
    for (const child of node.getChildren()) usePaintBoundsForExport(child);
  }
}

function cloneBranch(node: Konva.Node, contentLayer: Konva.Layer): Konva.Shape | Konva.Group {
  let branch = node.clone() as Konva.Shape | Konva.Group;
  let parent = node.getParent();
  while (parent && parent !== contentLayer) {
    const shell = new Konva.Group(parent.getAttrs());
    shell.add(branch);
    branch = shell;
    parent = parent.getParent();
  }
  return branch;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Block export produced no PNG data"));
    }, "image/png");
  });
}

async function waitForBlockAssets(node: Konva.Node): Promise<void> {
  for (const candidate of collectSubtree(node)) {
    await (candidate.getAttr("__imageReady") as Promise<void> | undefined);
    await (candidate.getAttr("__fillImageReady") as Promise<void> | undefined);
    const error =
      candidate.getAttr("__imageLoadError") ?? candidate.getAttr("__fillImageLoadError");
    if (error) throw new Error("Cannot export block because an image failed to load");
  }
}

function collectSubtree(node: Konva.Node): Konva.Node[] {
  const nodes = [node];
  if (node instanceof Konva.Container) {
    for (const child of node.getChildren()) nodes.push(...collectSubtree(child));
  }
  return nodes;
}
