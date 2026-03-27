import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "../__tests__/mocks/mock-renderer";
import { EditxEngine } from "../editx-engine";
import type { Color } from "./block.types";
import { BlockAPI } from "./block-api";
import {
 CROP_ENABLED,
 CROP_FLIP_HORIZONTAL,
 CROP_FLIP_VERTICAL,
 CROP_HEIGHT,
 CROP_ROTATION,
 CROP_SCALE_RATIO,
 CROP_SCALE_X,
 CROP_SCALE_Y,
 CROP_WIDTH,
 CROP_X,
 CROP_Y,
 FILL_COLOR,
 OPACITY,
 POSITION_X,
 POSITION_Y,
 SIZE_HEIGHT,
 SIZE_WIDTH,
 VISIBLE,
} from "./property-keys";

describe("BlockAPI", () => {
 let engine: EditxEngine;
 let block: BlockAPI;

 beforeEach(() => {
 engine = new EditxEngine({ renderer: undefined });
 block = new BlockAPI(engine);
 });

 describe("create / destroy", () => {
 it("creates a block and returns its id", () => {
 const id = block.create("graphic");
 expect(id).toBeDefined();
 expect(block.exists(id)).toBe(true);
 });

 it("destroys a block", () => {
 const id = block.create("graphic");
 block.destroy(id);
 expect(block.exists(id)).toBe(false);
 });

 it("create is undoable", () => {
 const id = block.create("graphic");
 engine.undo();
 expect(block.exists(id)).toBe(false);
 });

 it("destroy is undoable", () => {
 const id = block.create("graphic");
 block.destroy(id);
 engine.undo();
 expect(block.exists(id)).toBe(true);
 });
 });

 describe("type / kind", () => {
 it("getType returns the block type", () => {
 const id = block.create("text");
 expect(block.getType(id)).toBe("text");
 });

 it("setKind / getKind", () => {
 const id = block.create("graphic");
 block.setKind(id, "rectangle");
 expect(block.getKind(id)).toBe("rectangle");
 });

 it("setKind is undoable", () => {
 const id = block.create("graphic");
 block.setKind(id, "circle");
 engine.undo();
 expect(block.getKind(id)).toBe("");
 });
 });

 describe("hierarchy", () => {
 it("appendChild / getChildren / getParent", () => {
 const parent = block.create("page");
 const child = block.create("graphic");
 block.appendChild(parent, child);
 expect(block.getChildren(parent)).toContain(child);
 expect(block.getParent(child)).toBe(parent);
 });

 it("removeChild", () => {
 const parent = block.create("page");
 const child = block.create("graphic");
 block.appendChild(parent, child);
 block.removeChild(parent, child);
 expect(block.getChildren(parent)).not.toContain(child);
 expect(block.getParent(child)).toBeNull();
 });

 it("appendChild is undoable", () => {
 const parent = block.create("page");
 const child = block.create("graphic");
 block.appendChild(parent, child);
 engine.undo();
 expect(block.getChildren(parent)).not.toContain(child);
 });
 });

 describe("property getters", () => {
 it("getFloat returns default", () => {
 const id = block.create("graphic");
 expect(block.getFloat(id, POSITION_X)).toBe(0);
 });

 it("getString returns default", () => {
 const id = block.create("text");
 expect(block.getString(id, "text/content")).toBe("Text");
 });

 it("getBool returns default", () => {
 const id = block.create("graphic");
 expect(block.getBool(id, VISIBLE)).toBe(true);
 });

 it("getColor returns default", () => {
 const id = block.create("page");
 const color = block.getColor(id, FILL_COLOR);
 expect(color).toEqual({ r: 1, g: 1, b: 1, a: 1 });
 });
 });

 describe("property setters", () => {
 it("setFloat changes value", () => {
 const id = block.create("graphic");
 block.setFloat(id, POSITION_X, 42);
 expect(block.getFloat(id, POSITION_X)).toBe(42);
 });

 it("setString changes value", () => {
 const id = block.create("text");
 block.setString(id, "text/content", "Hello");
 expect(block.getString(id, "text/content")).toBe("Hello");
 });

 it("setBool changes value", () => {
 const id = block.create("graphic");
 block.setBool(id, VISIBLE, false);
 expect(block.getBool(id, VISIBLE)).toBe(false);
 });

 it("setColor changes value", () => {
 const id = block.create("graphic");
 const red: Color = { r: 1, g: 0, b: 0, a: 1 };
 block.setColor(id, FILL_COLOR, red);
 expect(block.getColor(id, FILL_COLOR)).toEqual(red);
 });

 it("setProperty is undoable", () => {
 const id = block.create("graphic");
 block.setFloat(id, POSITION_X, 100);
 engine.undo();
 expect(block.getFloat(id, POSITION_X)).toBe(0);
 });
 });

 describe("convenience setters", () => {
 it("setPosition sets x and y", () => {
 const id = block.create("graphic");
 block.setPosition(id, 10, 20);
 expect(block.getFloat(id, POSITION_X)).toBe(10);
 expect(block.getFloat(id, POSITION_Y)).toBe(20);
 });

 it("setPosition is a single undo step", () => {
 const id = block.create("graphic");
 block.setPosition(id, 10, 20);
 engine.undo();
 expect(block.getFloat(id, POSITION_X)).toBe(0);
 expect(block.getFloat(id, POSITION_Y)).toBe(0);
 });

 it("setSize sets width and height", () => {
 const id = block.create("graphic");
 block.setSize(id, 200, 300);
 expect(block.getFloat(id, SIZE_WIDTH)).toBe(200);
 expect(block.getFloat(id, SIZE_HEIGHT)).toBe(300);
 });

 it("setSize is a single undo step", () => {
 const id = block.create("graphic");
 block.setSize(id, 200, 300);
 engine.undo();
 expect(block.getFloat(id, SIZE_WIDTH)).toBe(100); // default
 expect(block.getFloat(id, SIZE_HEIGHT)).toBe(100);
 });

 it("setRotation changes rotation", () => {
 const id = block.create("graphic");
 block.setRotation(id, 45);
 expect(block.getFloat(id, "transform/rotation")).toBe(45);
 });

 it("setOpacity changes opacity", () => {
 const id = block.create("graphic");
 block.setOpacity(id, 0.5);
 expect(block.getFloat(id, OPACITY)).toBe(0.5);
 });

 it("setVisible changes visibility", () => {
 const id = block.create("graphic");
 block.setVisible(id, false);
 expect(block.getBool(id, VISIBLE)).toBe(false);
 });
 });

 describe("query", () => {
 it("findByType returns matching blocks", () => {
 const id1 = block.create("graphic");
 const id2 = block.create("graphic");
 block.create("text");
 expect(block.findByType("graphic")).toEqual(expect.arrayContaining([id1, id2]));
 });

 it("findByKind returns matching blocks", () => {
 const id = block.create("graphic");
 block.setKind(id, "circle");
 expect(block.findByKind("circle")).toContain(id);
 });

 it("findAllProperties returns keys", () => {
 const id = block.create("graphic");
 const keys = block.findAllProperties(id);
 expect(keys).toContain(POSITION_X);
 });
 });

 describe("crop properties on image blocks", () => {
 it("image block has crop defaults", () => {
 const id = block.create("image");
 expect(block.getFloat(id, CROP_X)).toBe(0);
 expect(block.getFloat(id, CROP_Y)).toBe(0);
 expect(block.getFloat(id, CROP_WIDTH)).toBe(0);
 expect(block.getFloat(id, CROP_HEIGHT)).toBe(0);
 expect(block.getBool(id, CROP_ENABLED)).toBe(false);
 });

 it("can set and get crop properties", () => {
 const id = block.create("image");
 block.setFloat(id, CROP_X, 50);
 block.setFloat(id, CROP_Y, 30);
 block.setFloat(id, CROP_WIDTH, 400);
 block.setFloat(id, CROP_HEIGHT, 300);
 block.setBool(id, CROP_ENABLED, true);

 expect(block.getFloat(id, CROP_X)).toBe(50);
 expect(block.getFloat(id, CROP_Y)).toBe(30);
 expect(block.getFloat(id, CROP_WIDTH)).toBe(400);
 expect(block.getFloat(id, CROP_HEIGHT)).toBe(300);
 expect(block.getBool(id, CROP_ENABLED)).toBe(true);
 });

 it("crop property changes are undoable", () => {
 const id = block.create("image");
 block.setBool(id, CROP_ENABLED, true);
 block.setFloat(id, CROP_X, 100);

 engine.undo();
 expect(block.getFloat(id, CROP_X)).toBe(0);

 engine.undo();
 expect(block.getBool(id, CROP_ENABLED)).toBe(false);

 engine.redo();
 expect(block.getBool(id, CROP_ENABLED)).toBe(true);
 });

 it("batch groups multiple crop changes into one undo step", () => {
 const id = block.create("image");
 engine.beginBatch();
 block.setFloat(id, CROP_X, 10);
 block.setFloat(id, CROP_Y, 20);
 block.setFloat(id, CROP_WIDTH, 300);
 block.setFloat(id, CROP_HEIGHT, 200);
 block.setBool(id, CROP_ENABLED, true);
 engine.endBatch();

 // All changes should undo in one step
 engine.undo();
 expect(block.getFloat(id, CROP_X)).toBe(0);
 expect(block.getFloat(id, CROP_Y)).toBe(0);
 expect(block.getFloat(id, CROP_WIDTH)).toBe(0);
 expect(block.getFloat(id, CROP_HEIGHT)).toBe(0);
 expect(block.getBool(id, CROP_ENABLED)).toBe(false);
 });
 });

 // â”€â”€ Editx-style Block Crop API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

 describe("Editx-style crop API", () => {
 it("supportsCrop returns true for image and page blocks", () => {
 const img = block.create("image");
 const page = block.create("page");
 const gfx = block.create("graphic");
 const txt = block.create("text");

 expect(block.supportsCrop(img)).toBe(true);
 expect(block.supportsCrop(page)).toBe(true);
 expect(block.supportsCrop(gfx)).toBe(false);
 expect(block.supportsCrop(txt)).toBe(false);
 });

 it("hasCrop returns false when crop is not enabled", () => {
 const img = block.create("image");
 const page = block.create("page");

 // CROP_ENABLED defaults to false, so hasCrop is false
 expect(block.hasCrop(img)).toBe(false);
 expect(block.hasCrop(page)).toBe(false);
 });

 it("hasCrop returns true after enabling crop", () => {
 const img = block.create("image");
 block.setBool(img, CROP_ENABLED, true);
 expect(block.hasCrop(img)).toBe(true);
 });

 it("image block has extended crop defaults", () => {
 const id = block.create("image");
 expect(block.getCropScaleX(id)).toBe(1);
 expect(block.getCropScaleY(id)).toBe(1);
 expect(block.getCropRotation(id)).toBe(0);
 expect(block.getCropScaleRatio(id)).toBe(1);
 expect(block.getBool(id, CROP_FLIP_HORIZONTAL)).toBe(false);
 expect(block.getBool(id, CROP_FLIP_VERTICAL)).toBe(false);
 expect(block.isCropAspectRatioLocked(id)).toBe(false);
 });

 it("setCropTranslationX / getCropTranslationX", () => {
 const id = block.create("image");
 block.setCropTranslationX(id, 42);
 expect(block.getCropTranslationX(id)).toBe(42);
 // Should map to the underlying crop/x property
 expect(block.getFloat(id, CROP_X)).toBe(42);
 });

 it("setCropTranslationY / getCropTranslationY", () => {
 const id = block.create("image");
 block.setCropTranslationY(id, 77);
 expect(block.getCropTranslationY(id)).toBe(77);
 expect(block.getFloat(id, CROP_Y)).toBe(77);
 });

 it("setCropScaleX / getCropScaleX", () => {
 const id = block.create("image");
 block.setCropScaleX(id, 500);
 expect(block.getCropScaleX(id)).toBe(500);
 expect(block.getFloat(id, CROP_SCALE_X)).toBe(500);
 });

 it("setCropScaleY / getCropScaleY", () => {
 const id = block.create("image");
 block.setCropScaleY(id, 300);
 expect(block.getCropScaleY(id)).toBe(300);
 expect(block.getFloat(id, CROP_SCALE_Y)).toBe(300);
 });

 it("setCropRotation / getCropRotation", () => {
 const id = block.create("image");
 block.setCropRotation(id, Math.PI / 4);
 expect(block.getCropRotation(id)).toBe(Math.PI / 4);
 expect(block.getFloat(id, CROP_ROTATION)).toBe(Math.PI / 4);
 });

 it("setCropScaleRatio / getCropScaleRatio", () => {
 const id = block.create("image");
 block.setCropScaleRatio(id, 2.5);
 expect(block.getCropScaleRatio(id)).toBe(2.5);
 expect(block.getFloat(id, CROP_SCALE_RATIO)).toBe(2.5);
 });

 it("flipCropHorizontal toggles the horizontal flip state", () => {
 const id = block.create("image");
 expect(block.getBool(id, CROP_FLIP_HORIZONTAL)).toBe(false);

 block.flipCropHorizontal(id);
 expect(block.getBool(id, CROP_FLIP_HORIZONTAL)).toBe(true);

 block.flipCropHorizontal(id);
 expect(block.getBool(id, CROP_FLIP_HORIZONTAL)).toBe(false);
 });

 it("flipCropVertical toggles the vertical flip state", () => {
 const id = block.create("image");
 expect(block.getBool(id, CROP_FLIP_VERTICAL)).toBe(false);

 block.flipCropVertical(id);
 expect(block.getBool(id, CROP_FLIP_VERTICAL)).toBe(true);

 block.flipCropVertical(id);
 expect(block.getBool(id, CROP_FLIP_VERTICAL)).toBe(false);
 });

 it("isCropAspectRatioLocked / setCropAspectRatioLocked", () => {
 const id = block.create("image");
 expect(block.isCropAspectRatioLocked(id)).toBe(false);

 block.setCropAspectRatioLocked(id, true);
 expect(block.isCropAspectRatioLocked(id)).toBe(true);

 block.setCropAspectRatioLocked(id, false);
 expect(block.isCropAspectRatioLocked(id)).toBe(false);
 });

 it("resetCrop resets all crop properties to defaults", () => {
 const id = block.create("image");

 // Set various crop properties
 block.setCropTranslationX(id, 50);
 block.setCropTranslationY(id, 30);
 block.setFloat(id, CROP_WIDTH, 400);
 block.setFloat(id, CROP_HEIGHT, 300);
 block.setBool(id, CROP_ENABLED, true);
 block.setCropScaleX(id, 2);
 block.setCropScaleY(id, 3);
 block.setCropRotation(id, 1.5);
 block.setCropScaleRatio(id, 2);
 block.flipCropHorizontal(id);
 block.flipCropVertical(id);
 block.setCropAspectRatioLocked(id, true);

 // Reset
 block.resetCrop(id);

 // All should be back to defaults
 expect(block.getCropTranslationX(id)).toBe(0);
 expect(block.getCropTranslationY(id)).toBe(0);
 expect(block.getFloat(id, CROP_WIDTH)).toBe(0);
 expect(block.getFloat(id, CROP_HEIGHT)).toBe(0);
 expect(block.getBool(id, CROP_ENABLED)).toBe(false);
 expect(block.getCropScaleX(id)).toBe(1);
 expect(block.getCropScaleY(id)).toBe(1);
 expect(block.getCropRotation(id)).toBe(0);
 expect(block.getCropScaleRatio(id)).toBe(1);
 expect(block.getBool(id, CROP_FLIP_HORIZONTAL)).toBe(false);
 expect(block.getBool(id, CROP_FLIP_VERTICAL)).toBe(false);
 expect(block.isCropAspectRatioLocked(id)).toBe(false);
 });

 it("resetCrop is undoable as a single step", () => {
 const id = block.create("image");
 block.setCropTranslationX(id, 50);
 block.setCropScaleX(id, 2);
 block.flipCropHorizontal(id);

 block.resetCrop(id);
 expect(block.getCropTranslationX(id)).toBe(0);

 engine.undo();
 expect(block.getCropTranslationX(id)).toBe(50);
 expect(block.getCropScaleX(id)).toBe(2);
 expect(block.getBool(id, CROP_FLIP_HORIZONTAL)).toBe(true);
 });

 it("adjustCropToFillFrame sets crop to full block dimensions", () => {
 const id = block.create("image");
 // Image block has default size 100x100
 block.adjustCropToFillFrame(id);

 expect(block.getCropTranslationX(id)).toBe(0);
 expect(block.getCropTranslationY(id)).toBe(0);
 expect(block.getFloat(id, CROP_WIDTH)).toBe(100);
 expect(block.getFloat(id, CROP_HEIGHT)).toBe(100);
 expect(block.getBool(id, CROP_ENABLED)).toBe(true);
 });

 it("adjustCropToFillFrame is undoable as a single step", () => {
 const id = block.create("image");
 block.setCropTranslationX(id, 20);
 block.setFloat(id, CROP_WIDTH, 50);

 block.adjustCropToFillFrame(id);
 expect(block.getFloat(id, CROP_WIDTH)).toBe(100);

 engine.undo();
 expect(block.getCropTranslationX(id)).toBe(20);
 expect(block.getFloat(id, CROP_WIDTH)).toBe(50);
 });

 it("crop API methods are undoable", () => {
 const id = block.create("image");
 block.setCropRotation(id, Math.PI / 2);
 block.setCropScaleRatio(id, 3);

 engine.undo();
 expect(block.getCropScaleRatio(id)).toBe(1);

 engine.undo();
 expect(block.getCropRotation(id)).toBe(0);

 engine.redo();
 expect(block.getCropRotation(id)).toBe(Math.PI / 2);
 });
 });

 // â”€â”€ Selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

 describe("selection", () => {
 it("select() selects a single block", () => {
 const id = block.create("graphic");
 block.select(id);
 expect(block.isSelected(id)).toBe(true);
 expect(block.findAllSelected()).toEqual([id]);
 });

 it("select() deselects previously selected blocks", () => {
 const a = block.create("graphic");
 const b = block.create("graphic");
 block.select(a);
 block.select(b);
 expect(block.isSelected(a)).toBe(false);
 expect(block.isSelected(b)).toBe(true);
 expect(block.findAllSelected()).toEqual([b]);
 });

 it("setSelected(id, true) adds to selection", () => {
 const a = block.create("graphic");
 const b = block.create("graphic");
 block.select(a);
 block.setSelected(b, true);
 expect(block.isSelected(a)).toBe(true);
 expect(block.isSelected(b)).toBe(true);
 expect(block.findAllSelected()).toEqual(expect.arrayContaining([a, b]));
 });

 it("setSelected(id, false) removes from selection", () => {
 const a = block.create("graphic");
 const b = block.create("graphic");
 block.select(a);
 block.setSelected(b, true);
 block.setSelected(a, false);
 expect(block.isSelected(a)).toBe(false);
 expect(block.findAllSelected()).toEqual([b]);
 });

 it("isSelected returns false for unselected blocks", () => {
 const id = block.create("graphic");
 expect(block.isSelected(id)).toBe(false);
 });

 it("findAllSelected returns empty array when nothing selected", () => {
 expect(block.findAllSelected()).toEqual([]);
 });

 it("findAllSelected returns a copy", () => {
 const id = block.create("graphic");
 block.select(id);
 const sel = block.findAllSelected();
 sel.push(999);
 expect(block.findAllSelected()).toEqual([id]);
 });

 it("deselectAll clears all selection", () => {
 const a = block.create("graphic");
 const b = block.create("graphic");
 block.select(a);
 block.setSelected(b, true);
 block.deselectAll();
 expect(block.findAllSelected()).toEqual([]);
 });

 it("emits selection:changed event", () => {
 const handler = vi.fn();
 engine.on("selection:changed", handler);
 const id = block.create("graphic");
 block.select(id);
 expect(handler).toHaveBeenCalledWith([id]);
 });

 it("calls renderer.showTransformer when selecting", () => {
 const renderer = createMockRenderer();
 const eng = new EditxEngine({ renderer });
 const b = new BlockAPI(eng);
 const id = b.create("graphic");
 b.select(id);
 expect(renderer.showTransformer).toHaveBeenCalledWith([id], "graphic");
 });

 it("calls renderer.hideTransformer when deselecting all", () => {
 const renderer = createMockRenderer();
 const eng = new EditxEngine({ renderer });
 const b = new BlockAPI(eng);
 const id = b.create("graphic");
 b.select(id);
 b.deselectAll();
 expect(renderer.hideTransformer).toHaveBeenCalled();
 });
 });

 // â”€â”€ addImage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

 describe("addImage", () => {
 it("creates an image block with correct properties", () => {
 const page = block.create("page");
 const imgId = block.addImage(page, "data:image/png;base64,abc", 10, 20, 100, 80, 200, 160);

 expect(block.getType(imgId)).toBe("image");
 expect(block.getPosition(imgId)).toEqual({ x: 10, y: 20 });
 expect(block.getSize(imgId)).toEqual({ width: 100, height: 80 });
 expect(block.getString(imgId, "image/src")).toBe("data:image/png;base64,abc");
 expect(block.getFloat(imgId, "image/originalWidth")).toBe(200);
 expect(block.getFloat(imgId, "image/originalHeight")).toBe(160);
 expect(block.getChildren(page)).toContain(imgId);
 });

 it("addImage is undoable as a single step", () => {
 const page = block.create("page");
 block.addImage(page, "data:image/png;base64,abc", 0, 0, 50, 50, 100, 100);
 expect(block.getChildren(page).length).toBe(1);

 engine.undo();
 expect(block.getChildren(page).length).toBe(0);

 engine.redo();
 expect(block.getChildren(page).length).toBe(1);
 });
 });

 // â”€â”€ Z-order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

 describe("z-order", () => {
 let page: number;
 let a: number;
 let b: number;
 let c: number;

 beforeEach(() => {
 page = block.create("page");
 a = block.create("graphic");
 b = block.create("graphic");
 c = block.create("graphic");
 block.appendChild(page, a);
 block.appendChild(page, b);
 block.appendChild(page, c);
 });

 it("bringForward moves block one step up", () => {
 block.bringForward(a); // a was at index 0, now at 1
 expect(block.getChildren(page)).toEqual([b, a, c]);
 });

 it("sendBackward moves block one step down", () => {
 block.sendBackward(c); // c was at index 2, now at 1
 expect(block.getChildren(page)).toEqual([a, c, b]);
 });

 it("bringToFront moves block to last position", () => {
 block.bringToFront(a);
 expect(block.getChildren(page)).toEqual([b, c, a]);
 });

 it("sendToBack moves block to first position", () => {
 block.sendToBack(c);
 expect(block.getChildren(page)).toEqual([c, a, b]);
 });

 it("bringForward at top is a no-op", () => {
 block.bringForward(c); // already at end
 expect(block.getChildren(page)).toEqual([a, b, c]);
 });

 it("sendBackward at bottom is a no-op", () => {
 block.sendBackward(a); // already at start
 expect(block.getChildren(page)).toEqual([a, b, c]);
 });

 it("z-order operations are undoable", () => {
 block.bringToFront(a);
 expect(block.getChildren(page)).toEqual([b, c, a]);

 engine.undo();
 expect(block.getChildren(page)).toEqual([a, b, c]);
 });
 });

 // â”€â”€ Alignment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

 describe("alignToPage", () => {
 let page: number;
 let child: number;

 beforeEach(() => {
 page = block.create("page");
 block.setFloat(page, "page/width", 1000);
 block.setFloat(page, "page/height", 800);
 child = block.create("graphic");
 block.setSize(child, 200, 100);
 block.setPosition(child, 50, 50);
 block.appendChild(page, child);
 });

 it("aligns left", () => {
 block.alignToPage(child, "left");
 expect(block.getPosition(child).x).toBe(0);
 });

 it("aligns center", () => {
 block.alignToPage(child, "center");
 expect(block.getPosition(child).x).toBe(400); // (1000 - 200) / 2
 });

 it("aligns right", () => {
 block.alignToPage(child, "right");
 expect(block.getPosition(child).x).toBe(800); // 1000 - 200
 });

 it("aligns top", () => {
 block.alignToPage(child, "top");
 expect(block.getPosition(child).y).toBe(0);
 });

 it("aligns middle", () => {
 block.alignToPage(child, "middle");
 expect(block.getPosition(child).y).toBe(350); // (800 - 100) / 2
 });

 it("aligns bottom", () => {
 block.alignToPage(child, "bottom");
 expect(block.getPosition(child).y).toBe(700); // 800 - 100
 });
 });

 // â”€â”€ Duplicate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

 describe("duplicate", () => {
 it("creates a copy with offset position", () => {
 const page = block.create("page");
 const orig = block.create("graphic");
 block.setPosition(orig, 100, 100);
 block.setSize(orig, 50, 50);
 block.appendChild(page, orig);

 const copy = block.duplicate(orig);
 expect(copy).not.toBe(orig);
 expect(block.getType(copy)).toBe("graphic");
 expect(block.getChildren(page)).toContain(copy);

 // Copy should be offset by 20px
 const pos = block.getPosition(copy);
 expect(pos.x).toBe(120);
 expect(pos.y).toBe(120);
 });

 it("duplicate is undoable", () => {
 const page = block.create("page");
 const orig = block.create("graphic");
 block.appendChild(page, orig);
 block.duplicate(orig);
 expect(block.getChildren(page).length).toBe(2);

 engine.undo();
 expect(block.getChildren(page).length).toBe(1);
 });
 });
});
