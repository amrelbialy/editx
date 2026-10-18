import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockData } from "./block/block.types";
import { CROP_X, CROP_Y, IMAGE_SRC, TEXT_RUNS } from "./block/property-keys";
import { EditxEngine } from "./editx-engine";

function snapshot(engine: EditxEngine) {
  const scene = JSON.parse(engine.scene.saveToString()) as { blocks: BlockData[] };
  scene.blocks.sort((a, b) => a.id - b.id);
  return scene;
}

function populate(engine: EditxEngine, page: number) {
  const block = engine.block;
  block.setName(page, "Campaign");
  block.setPosition(page, 12, 34);
  block.setPageFillColor(page, { r: 0.2, g: 0.4, b: 0.6, a: 1 });
  const image = block.create("image");
  block.appendChild(page, image);
  block.setString(image, IMAGE_SRC, "https://example.com/product.png");
  block.setFloat(image, CROP_X, 23);
  block.setFloat(image, CROP_Y, 17);
  block.setPosition(image, 30, 40);
  const text = block.create("text");
  block.appendChild(page, text);
  block.setProperty(text, TEXT_RUNS, [
    {
      text: "Special offer",
      style: {
        fillGradient: { type: "radial", stops: [{ offset: 0, color: "#123456" }] },
        textStrokeGradient: {
          type: "linear",
          angle: 25,
          stops: [{ offset: 0, color: "#ffffff" }],
        },
        backgroundPadding: { left: 4 },
      },
    },
  ]);
  const graphic = block.create("graphic");
  block.appendChild(page, graphic);
  block.setPosition(graphic, 7, 11);
  block.setRotation(graphic, 15);
  const shape = block.createShape("star");
  block.setShape(graphic, shape);
  const fill = block.createFill("gradient");
  block.setFill(graphic, fill);
  block.setName(fill, "Product gradient");
  block.setFillGradient(graphic, {
    type: "linear",
    angle: 35,
    stops: [
      { offset: 0, color: "#000000" },
      { offset: 1, color: "#ffffff" },
    ],
  });
  for (const kind of ["adjustments", "filter"] as const) {
    const effect = block.createEffect(kind);
    block.appendEffect(graphic, effect);
    block.setFloat(effect, "custom/strength", 0.3);
  }
  const inner = block.group([text, graphic]);
  const outer = block.group([image, inner]);
  block.setProperty(outer, "custom/not-a-block-reference", text);
  return { text, outer };
}

describe("page duplication", () => {
  let engine: EditxEngine;
  let first: number;

  beforeEach(async () => {
    engine = new EditxEngine();
    await engine.scene.create({ width: 800, height: 600 });
    first = engine.getActivePage()!;
  });

  it("clones the complete graph without offsets, aliases, orphan blocks or resource changes", () => {
    const { text, outer } = populate(engine, first);
    engine.block.select(text);
    engine.block.enterGroup(outer);
    const originalIds = new Set(engine._getBlockStore().getAllBlockIds());
    const selection = vi.fn();
    engine.block.onSelectionChanged(selection);
    engine.clearHistory();

    const duplicate = engine.scene.duplicatePage(first);
    const store = engine._getBlockStore();
    const mapping = new Map([[first, duplicate]]);
    for (const [sourceId, copyId] of mapping) {
      const source = store.get(sourceId)!;
      const copy = store.get(copyId)!;
      expect(originalIds.has(copyId)).toBe(false);
      expect(copy.type).toBe(source.type);
      expect(copy.kind).toBe(source.kind);
      expect(copy.name).toBe(source.name);
      expect(copy.properties).toEqual(source.properties);
      expect(copy.properties).not.toBe(source.properties);
      expect(copy.children).not.toBe(source.children);
      expect(copy.effectIds).not.toBe(source.effectIds);
      expect(copy.parentId).toBe(
        sourceId === first ? source.parentId : (mapping.get(source.parentId!) ?? null),
      );
      expect(copy.children).toHaveLength(source.children.length);
      expect(copy.effectIds).toHaveLength(source.effectIds.length);
      const sourceLinks = [source.shapeId, source.fillId, ...source.effectIds, ...source.children];
      const copyLinks = [copy.shapeId, copy.fillId, ...copy.effectIds, ...copy.children];
      sourceLinks.forEach((sourceLink, index) => {
        if (sourceLink === null) expect(copyLinks[index]).toBeNull();
        else mapping.set(sourceLink, copyLinks[index]!);
      });
    }
    expect(new Set(mapping.values()).size).toBe(mapping.size);
    expect(store.getAllBlockIds()).toHaveLength(originalIds.size + mapping.size);
    expect(engine.block.getPageDimensions(duplicate)).toEqual({ width: 800, height: 600 });
    const sourceStyle = engine.block.getTextRuns(text)[0].style;
    const copyStyle = engine.block.getTextRuns(mapping.get(text)!)[0].style;
    expect(copyStyle).not.toBe(sourceStyle);
    expect(copyStyle.fillGradient!.stops[0]).not.toBe(sourceStyle.fillGradient!.stops[0]);
    expect(copyStyle.textStrokeGradient!.stops[0]).not.toBe(
      sourceStyle.textStrokeGradient!.stops[0],
    );
    expect(copyStyle.backgroundPadding).not.toBe(sourceStyle.backgroundPadding);
    expect(engine.block.findAllSelected()).toEqual([text]);
    expect(engine.block.getGroupContext()).toEqual([outer]);
    expect(selection).not.toHaveBeenCalled();
    expect(engine.getActivePage()).toBe(duplicate);
  });

  it("inserts after its source and restores exact snapshots and stable IDs in one undo step", () => {
    populate(engine, first);
    const previous = engine.scene.addPage({ width: 300, height: 700 });
    engine.clearHistory();
    const before = snapshot(engine);
    const history = vi.fn();
    engine.onHistoryChanged(history);

    const duplicate = engine.scene.duplicatePage(first);
    const after = snapshot(engine);
    expect(engine.scene.getPages()).toEqual([first, duplicate, previous]);
    expect(history).toHaveBeenCalledTimes(1);

    for (let cycle = 0; cycle < 3; cycle++) {
      engine.scene.setActivePage(first);
      engine.undo();
      expect(snapshot(engine)).toEqual(before);
      expect(engine.getActivePage()).toBe(previous);
      expect(engine.canUndo()).toBe(false);
      engine.scene.setActivePage(first);
      engine.redo();
      expect(snapshot(engine)).toEqual(after);
      expect(engine.getActivePage()).toBe(duplicate);
      expect(engine.canRedo()).toBe(false);
    }
    expect(history).toHaveBeenCalledTimes(7);
  });

  it("round-trips duplicated content and navigation through native scene serialization", async () => {
    populate(engine, first);
    const duplicate = engine.scene.duplicatePage(first);
    const restored = new EditxEngine();
    await restored.scene.loadFromString(engine.scene.saveToString());
    expect(snapshot(restored)).toEqual(snapshot(engine));
    expect(restored.getActivePage()).toBe(duplicate);
    expect(restored.scene.getPages()).toEqual([first, duplicate]);
    expect(restored.canUndo()).toBe(false);
  });

  it("preserves SVG geometry and image-fill crop settings with independent sub-blocks", () => {
    const block = engine.block;
    const graphic = block.create("graphic");
    block.appendChild(first, graphic);
    block.setShapeGeometry(graphic, {
      type: "path",
      name: "Badge",
      pathData: "M 0 0 L 128 0 L 64 64 Z",
      viewBox: { width: 128, height: 64 },
    });
    const fill = block.createFill("image");
    block.setFill(graphic, fill);
    block.setFillImage(graphic, {
      src: "https://example.com/logo.png",
      mode: "crop",
      alignment: "bottom-right",
      offsetX: 14,
      offsetY: 25,
      scale: 0.5,
      rotation: 35,
      flipHorizontal: true,
    });

    const duplicate = engine.scene.duplicatePage(first);
    const [copiedGraphic] = block.getChildren(duplicate);
    expect(block.getFill(copiedGraphic)).not.toBe(fill);
    expect(block.getFillImage(copiedGraphic)).toEqual(block.getFillImage(graphic));
    const store = engine._getBlockStore();
    const shape = store.get(block.getShape(graphic)!)!;
    const copiedShape = store.get(block.getShape(copiedGraphic)!)!;
    expect(copiedShape.id).not.toBe(shape.id);
    expect(copiedShape.properties).toEqual(shape.properties);
    expect(copiedShape.name).toBe(shape.name);
  });
});
