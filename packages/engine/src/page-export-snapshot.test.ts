import { beforeEach, describe, expect, it } from "vitest";
import { BlockStore } from "./block/block-store";
import { FILL_GRADIENT_STOPS, PAGE_WIDTH, TEXT_RUNS } from "./block/property-keys";
import { capturePageExport } from "./page-export-snapshot";

describe("page export snapshots", () => {
  let store: BlockStore;
  let page: number;
  let group: number;
  let text: number;
  const capture = () => capturePageExport(page, (id) => store.get(id));

  beforeEach(() => {
    store = new BlockStore();
    page = store.create("page");
    group = store.create("group");
    text = store.create("text");
    store.appendChild(page, group);
    store.appendChild(group, text);
  });

  it("copies only the owned tree and rendering references, preserving order", () => {
    const otherPage = store.create("page");
    const sibling = store.create("graphic");
    store.appendChild(page, sibling);
    const fill = store.create("fill", "gradient");
    const effect = store.create("effect", "adjustments");
    const shape = store.create("shape", "ellipse");
    Object.assign(store.get(sibling)!, { shapeId: shape, fillId: fill, effectIds: [effect] });
    store.setProperty(fill, FILL_GRADIENT_STOPS, [{ offset: 0, color: "#123456" }]);
    store.setProperty(text, TEXT_RUNS, [
      {
        text: "Hi",
        style: { fillGradient: { type: "linear", stops: [{ offset: 1, color: "red" }] } },
      },
    ]);
    const result = capture();
    expect([...result.blocks.keys()]).toEqual([page, group, text, sibling, shape, fill, effect]);
    expect(result.blocks.has(otherPage)).toBe(false);
    expect(result.page.children).toEqual([group, sibling]);
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1080);
    store.get(page)!.children.reverse();
    store.setProperty(text, TEXT_RUNS, [{ text: "changed", style: {} }]);
    store.setProperty(page, PAGE_WIDTH, 200);
    expect(result.page.children).toEqual([group, sibling]);
    expect(result.blocks.get(text)!.properties[TEXT_RUNS]).toMatchObject([{ text: "Hi" }]);
    expect(result.width).toBe(1080);
  });

  it("rejects absent or incorrectly typed references", () => {
    store.get(text)!.fillId = 999;
    expect(capture).toThrow("999 not found");
    store.get(text)!.fillId = store.create("group");
    expect(capture).toThrow("must be a fill");
  });

  it("captures shared dependencies once without treating them as cycles", () => {
    const graphic = store.create("graphic");
    store.appendChild(page, graphic);
    const fill = store.create("fill", "gradient");
    store.get(text)!.fillId = fill;
    store.get(graphic)!.fillId = fill;
    store.setProperty(fill, FILL_GRADIENT_STOPS, [{ offset: 0, color: "red" }]);

    const result = capture();
    expect([...result.blocks.keys()]).toEqual([page, group, text, fill, graphic]);
    expect(result.blocks.get(text)!.fillId).toBe(fill);
    expect(result.blocks.get(graphic)!.fillId).toBe(fill);
    expect(result.blocks.get(fill)).not.toBe(store.get(fill));
  });

  it("rejects duplicate children, broken ownership, and nested pages", () => {
    store.get(page)!.children.push(group);
    expect(capture).toThrow("ownership");
    store.get(page)!.children.pop();
    store.get(text)!.parentId = page;
    expect(capture).toThrow("ownership");
    store.get(text)!.parentId = group;
    const nested = store.create("page");
    store.appendChild(group, nested);
    expect(capture).toThrow("nested page");
  });

  it("rejects reference cycles and invalid dimensions", () => {
    const effect = store.create("effect");
    store.get(text)!.effectIds = [effect];
    store.get(effect)!.effectIds = [effect];
    expect(capture).toThrow("Cyclic");
    store.get(effect)!.effectIds = [];
    store.setProperty(page, PAGE_WIDTH, 0);
    expect(capture).toThrow("dimensions");
  });
});
