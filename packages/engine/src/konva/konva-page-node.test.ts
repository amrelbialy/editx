import type Konva from "konva";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlockStore } from "../block/block-store";
import { IMAGE_SRC } from "../block/property-keys";
import { createPageNode, updatePageNode } from "./konva-page-node";

const { load, filter } = vi.hoisted(() => ({ load: vi.fn(), filter: vi.fn() }));
vi.mock("../utils/image-loader", () => ({ loadImage: load }));
vi.mock("./konva-node-filters", () => ({ applyFilters: filter }));

describe("page background image readiness", () => {
  beforeEach(() => vi.resetAllMocks());

  function setup() {
    const store = new BlockStore();
    const pageId = store.create("page");
    const page = store.get(pageId)!;
    const group = createPageNode(pageId);
    const image = group.children[1] as Konva.Image;
    const stage = { batchDraw: vi.fn() } as Konva.Stage;
    vi.spyOn(image, "getStage").mockReturnValue(stage);
    const update = (src: string) => {
      store.setProperty(pageId, IMAGE_SRC, src);
      updatePageNode(group, page, stage, null);
    };
    return { group, image, stage, update };
  }

  it("waits for decoding and reapplies effects after the image arrives", async () => {
    const { image, update, group } = setup();
    let release!: (value: HTMLImageElement) => void;
    load.mockImplementation(
      () =>
        new Promise<HTMLImageElement>((resolve) => {
          release = resolve;
        }),
    );
    update("page.png");
    const source = { width: 10, height: 20 } as HTMLImageElement;
    expect(image.image()).toBeUndefined();
    filter.mockClear();
    release(source);
    await image.getAttr("__imageReady");
    expect(image.image()).toBe(source);
    expect(filter).toHaveBeenCalledOnce();
    expect(image.getAttr("__imageLoadError")).toBeUndefined();
    group.destroy();
  });

  it("rejects stale results when sources change or the background is cleared", async () => {
    const { image, update, group } = setup();
    const releases = new Map<string, (value: HTMLImageElement) => void>();
    load.mockImplementation(
      (src: string) => new Promise<HTMLImageElement>((resolve) => releases.set(src, resolve)),
    );
    update("old.png");
    const oldReady = image.getAttr("__imageReady");
    update("new.png");
    const newReady = image.getAttr("__imageReady");
    const source = { width: 10, height: 20 } as HTMLImageElement;
    releases.get("new.png")!(source);
    await newReady;
    releases.get("old.png")!({ width: 1, height: 1 } as HTMLImageElement);
    await oldReady;
    expect(image.image()).toBe(source);
    update("pending.png");
    const pending = image.getAttr("__imageReady");
    update("");
    releases.get("pending.png")!({ width: 5, height: 5 } as HTMLImageElement);
    await pending;
    expect(image.visible()).toBe(false);
    expect(image.image()).toBe(source);
    group.destroy();
  });

  it("records failures for export and allows retrying the same source", async () => {
    const { image, update, group } = setup();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = new Error("offline");
    load.mockRejectedValueOnce(cause).mockResolvedValue({ width: 10, height: 10 });
    update("retry.png");
    await image.getAttr("__imageReady");
    expect(image.getAttr("__imageLoadError")).toBe(cause);
    expect(image.getAttr("loadedSrc")).toBeUndefined();
    update("retry.png");
    await image.getAttr("__imageReady");
    expect(load).toHaveBeenCalledTimes(2);
    expect(image.getAttr("__imageLoadError")).toBeUndefined();
    log.mockRestore();
    group.destroy();
  });
});
