import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlockStore } from "../block/block-store";
import { PAGE_HEIGHT, PAGE_WIDTH, POSITION_X, VISIBLE } from "../block/property-keys";
import { exportPage } from "./konva-export-page";

const fake = vi.hoisted(() => {
  class Node {
    attrs: Record<string, unknown> = {};
    children: Node[] = [];
    add(node: Node) {
      this.children.push(node);
    }
    visible(value: boolean) {
      this.attrs.visible = value;
    }
    listening() {}
    draggable() {}
  }
  class Group extends Node {
    clip(value: unknown) {
      this.attrs.clip = value;
    }
  }
  const encode = vi.fn();
  const rasterize = vi.fn();
  class Layer extends Node {
    draw = vi.fn();
    toCanvas(options: { width: number; height: number; pixelRatio: number }) {
      rasterize(options);
      return {
        width: options.width * options.pixelRatio,
        height: options.height * options.pixelRatio,
        toBlob: encode,
      };
    }
  }
  const stages: Stage[] = [];
  class Stage extends Node {
    destroy = vi.fn();
    constructor(readonly options: unknown) {
      super();
      stages.push(this);
    }
  }
  const prepare = vi.fn();
  const wait = vi.fn();
  const factory = vi.fn();
  return { Node, Group, Layer, Stage, stages, encode, rasterize, prepare, wait, factory };
});

vi.mock("konva", () => ({
  default: { Stage: fake.Stage, Layer: fake.Layer, Group: fake.Group },
}));
vi.mock("./konva-node-factory", () => ({
  KonvaNodeFactory: class {
    constructor(...args: unknown[]) {
      fake.factory(...args);
    }
    createNode(_id: number, block: { type: string }) {
      return block.type === "page" || block.type === "group" ? new fake.Group() : new fake.Node();
    }
    updateNode(node: InstanceType<typeof fake.Node>, block: { id: number; properties: unknown }) {
      node.attrs.blockId = block.id;
      node.attrs.properties = block.properties;
    }
  },
}));
vi.mock("./konva-export-page-assets", () => ({
  preparePageAssets: fake.prepare,
  waitForPageNodes: fake.wait,
  visiblePageBlocks: (snapshot: { blocks: Map<number, { properties: Record<string, unknown> }> }) =>
    [...snapshot.blocks.values()].filter(
      (block) => block.properties["appearance/visible"] !== false,
    ),
}));

describe("isolated page export rendering", () => {
  let store: BlockStore;
  let page: number;
  let group: number;
  let child: number;
  const resolve = (id: number) => store.get(id);

  beforeEach(() => {
    vi.clearAllMocks();
    fake.stages.length = 0;
    vi.stubGlobal("document", { createElement: () => ({}) });
    fake.prepare.mockResolvedValue(undefined);
    fake.wait.mockResolvedValue(undefined);
    fake.encode.mockImplementation((callback: BlobCallback, mime: string) =>
      callback(new Blob(["pixels"], { type: mime })),
    );
    store = new BlockStore();
    page = store.create("page");
    store.setProperty(page, PAGE_WIDTH, 80);
    store.setProperty(page, PAGE_HEIGHT, 120);
    group = store.create("group");
    child = store.create("graphic");
    store.appendChild(page, group);
    store.appendChild(group, child);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    "png",
    "jpeg",
    "webp",
  ] as const)("clips owned nodes and encodes %s at target density", async (format) => {
    const blob = await exportPage(page, resolve, { format, quality: 0.6, pixelRatio: 2 });
    expect(blob.type).toBe(`image/${format}`);
    expect(fake.rasterize).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      width: 80,
      height: 120,
      pixelRatio: 2,
    });
    expect(fake.encode).toHaveBeenCalledWith(
      expect.any(Function),
      `image/${format}`,
      format === "png" ? undefined : 0.6,
    );
    expect(fake.factory).toHaveBeenCalledWith(fake.stages[0], null);
    const root = fake.stages[0].children[0].children[0];
    expect(root.attrs).toMatchObject({
      blockId: page,
      clip: { x: 0, y: 0, width: 80, height: 120 },
    });
    expect(root.children[0].attrs.blockId).toBe(group);
    expect(root.children[0].children[0].attrs.blockId).toBe(child);
    expect(fake.stages[0].destroy).toHaveBeenCalledOnce();
  });

  it("captures content before waits and isolates concurrent exports", async () => {
    let release!: () => void;
    fake.prepare.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    store.setProperty(child, POSITION_X, 10);
    const first = exportPage(page, resolve, {});
    store.setProperty(child, POSITION_X, 20);
    await exportPage(page, resolve, {});
    release();
    await first;
    const properties = (stage: InstanceType<typeof fake.Stage>) =>
      stage.children[0].children[0].children[0].children[0].attrs.properties;
    expect(properties(fake.stages[0])).toMatchObject({ [POSITION_X]: 20 });
    expect(properties(fake.stages[1])).toMatchObject({ [POSITION_X]: 10 });
    for (const stage of fake.stages) expect(stage.destroy).toHaveBeenCalledOnce();
  });

  it("keeps child-array z-order and omits unrelated pages", async () => {
    const top = store.create("text");
    store.appendChild(group, top);
    const other = store.create("page");
    store.appendChild(other, store.create("image"));
    await exportPage(page, resolve, {});
    const branch = fake.stages[0].children[0].children[0].children[0];
    expect(branch.children.map((node) => node.attrs.blockId)).toEqual([child, top]);
  });

  it("does not initiate image loading for an authored-hidden page", async () => {
    store.setProperty(page, VISIBLE, false);
    await exportPage(page, resolve, {});
    const root = fake.stages[0].children[0].children[0];
    expect(root.attrs.visible).toBe(false);
    expect(root.children).toEqual([]);
  });

  it.each([
    "empty",
    "mismatch",
    "throw",
  ])("identifies %s encoding failure and cleans up", async (mode) => {
    const cause = new Error("tainted");
    fake.encode.mockImplementation((callback: BlobCallback) => {
      if (mode === "throw") throw cause;
      callback(mode === "empty" ? null : new Blob([], { type: "image/png" }));
    });
    await expect(exportPage(page, resolve, { format: "webp" })).rejects.toMatchObject({
      code: "RENDER_FAILED",
      pageId: page,
    });
    expect(fake.stages[0].destroy).toHaveBeenCalledOnce();
    fake.encode.mockImplementation((callback: BlobCallback, mime: string) =>
      callback(new Blob([], { type: mime })),
    );
    await expect(exportPage(page, resolve, { format: "jpeg" })).resolves.toMatchObject({
      type: "image/jpeg",
    });
  });
});
