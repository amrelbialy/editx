import {
  PageExportError,
  type Color,
  type EditxEngine,
} from "@editx/engine";
import { createEngine } from "@editx/engine/konva";
import { useEffect, useRef, useState } from "react";
import type { DecodedExport, ExportFixtureIds, ExportState, PageExportHarness, Pixel } from "./page-export.types";

declare global {
  interface Window {
    __pageExportHarness?: PageExportHarness;
    __pageExportError?: string;
  }
}

const RED: Color = { r: 1, g: 0, b: 0, a: 1 };
const GREEN: Color = { r: 0, g: 1, b: 0, a: 1 };
const BLUE: Color = { r: 0, g: 0, b: 1, a: 1 };
const YELLOW: Color = { r: 1, g: 1, b: 0, a: 1 };
const MAGENTA: Color = { r: 1, g: 0, b: 1, a: 1 };
const TRANSPARENT: Color = { r: 0, g: 0, b: 0, a: 0 };
const CROP_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#09f"/></svg>',
  );

export function PageExportFixture() {
  const rootRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState("starting");

  useEffect(() => {
    let engine: EditxEngine | undefined;
    let active = true;
    void (async () => {
      if (!rootRef.current) throw new Error("fixture root unavailable");
      engine = await createEngine({ container: rootRef.current });
      await engine.scene.create({ width: 80, height: 50 });
      const activePage = engine.getActivePage();
      if (activePage === null) throw new Error("active page unavailable");
      addShape(engine, activePage, 0, 0, 80, 50, MAGENTA);

      const target = engine.scene.addPage({ width: 40, height: 30 });
      engine.scene.setPageProperties(target, {
        backgroundColor: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
      });
      const red = addShape(engine, target, -5, -5, 30, 25, RED);
      const green = addShape(engine, target, 5, 5, 20, 15, GREEN);
      engine.block.group([red, green]);
      const hidden = addShape(engine, target, 5, 5, 20, 15, BLUE);
      engine.block.setVisible(hidden, false);
      addShape(engine, target, 35, 20, 20, 20, YELLOW);

      const transparent = engine.scene.addPage({ width: 13, height: 7 });
      engine.scene.setPageProperties(transparent, { backgroundColor: TRANSPARENT });
      engine.setActivePage(activePage);
      engine.clearHistory();

      const ids = { active: activePage, target, transparent };
      window.__pageExportHarness = buildHarness(engine, ids);
      if (active) setStatus("ready");
    })().catch((error: unknown) => {
      window.__pageExportError = error instanceof Error ? error.message : String(error);
      if (active) setStatus("failed");
    });
    return () => {
      active = false;
      engine?.dispose();
      delete window.__pageExportHarness;
      delete window.__pageExportError;
    };
  }, []);

  return (
    <>
      <output data-status={status}>{status}</output>
      <div ref={rootRef} style={{ width: 500, height: 400 }} />
    </>
  );
}

function buildHarness(engine: EditxEngine, ids: ExportFixtureIds): PageExportHarness {
  return {
    ids: () => ids,
    exportDecoded: async (pageId, options, points = []) =>
      decode(await engine.exportPage(pageId, options), points),
    exportFailure: async (pageId) => {
      try {
        await engine.exportPage(pageId);
        throw new Error("export unexpectedly succeeded");
      } catch (error: unknown) {
        if (error instanceof PageExportError) {
          return {
            name: error.name,
            code: error.code,
            pageId: error.pageId,
            blockId: error.blockId,
            resource: error.resource,
            cause: error.cause instanceof Error ? error.cause.message : String(error.cause),
          };
        }
        throw error;
      }
    },
    addAssetPage: (kind, src) => {
      const width = 16;
      const height = 12;
      const pageId = engine.scene.addPage({ width, height });
      engine.scene.setPageProperties(pageId, { backgroundColor: TRANSPARENT });
      let blockId = pageId;
      if (kind === "background") {
        engine.block.setPageImageOriginalDimensions(pageId, width, height);
        engine.block.setPageImageSrc(pageId, src);
      } else if (kind === "image") {
        blockId = engine.block.addImage(pageId, src, 0, 0, width, height, width, height);
      } else {
        blockId = engine.block.addShape(pageId, "rect", "image", 0, 0, width, height);
        engine.block.setFillImage(blockId, { src, mode: "cover" });
      }
      return { pageId, blockId };
    },
    setImageSource: (blockId, src) => engine.block.setString(blockId, "image/src", src),
    addFontPage: (family, src) => {
      document.fonts.add(new FontFace(family, `url(${JSON.stringify(src)})`));
      const pageId = engine.scene.addPage({ width: 90, height: 30 });
      const blockId = engine.block.addText(pageId, 2, 2, 86, 26, "registered font", {
        style: { fontFamily: family, fontSize: 16, fill: "#000000" },
      });
      return { pageId, blockId };
    },
    preparePreservation: async () => {
      engine.setActivePage(ids.active);
      const cropBlock = engine.block.addShape(ids.active, "rect", "image", 10, 10, 24, 20);
      engine.block.setFillImage(cropBlock, { src: CROP_IMAGE, mode: "crop" });
      const peer = addShape(engine, ids.active, 38, 10, 12, 12, GREEN);
      const group = engine.block.group([cropBlock, peer]);
      await nextPaint();
      engine.clearHistory();
      engine.block.setName(cropBlock, "redo marker");
      engine.undo();
      engine.block.enterGroup(group);
      engine.block.select(cropBlock);
      engine.editor.setEditMode("Crop", { blockId: cropBlock });
      engine.editor.updateImageFillCrop({ offsetX: 0.2, scale: 1.15 });
      engine.editor.setZoom(1.25);
      engine.editor.panTo(17, 23);
      return readState(engine);
    },
    readState: () => readState(engine),
  };
}

function addShape(
  engine: EditxEngine,
  pageId: number,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Color,
): number {
  const id = engine.block.addShape(pageId, "rect", "solid", x, y, width, height);
  engine.block.setFillSolidColor(id, color);
  return id;
}

function readState(engine: EditxEngine): ExportState {
  return {
    activePage: engine.getActivePage(),
    selection: engine.block.findAllSelected(),
    groupContext: engine.block.getGroupContext(),
    zoom: engine.editor.getZoom(),
    pan: engine.editor.getPan(),
    serialized: engine.scene.saveToString(),
    canRedo: engine.canRedo(),
    editMode: engine.editor.getEditMode(),
    crop: engine.editor.getImageFillCrop(),
  };
}

async function decode(blob: Blob, points: Array<[number, number]>): Promise<DecodedExport> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas unavailable");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = Object.fromEntries(
    points.map(([x, y]) => [
      `${x},${y}`,
      [...context.getImageData(x, y, 1, 1).data] as Pixel,
    ]),
  );
  return { mime: blob.type, width: canvas.width, height: canvas.height, pixels };
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
