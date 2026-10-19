import Konva from "konva";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlockStore } from "../block/block-store";
import {
  FILL_ENABLED,
  FILL_IMAGE_SRC,
  IMAGE_SRC,
  OPACITY,
  TEXT_RUNS,
  VISIBLE,
} from "../block/property-keys";
import { capturePageExport } from "../page-export-snapshot";
import { preparePageAssets, waitForPageNodes } from "./konva-export-page-assets";

const { loadImageMock } = vi.hoisted(() => ({ loadImageMock: vi.fn() }));
vi.mock("../utils/image-loader", () => ({ loadImage: loadImageMock }));

describe("page export dependencies", () => {
  let store: BlockStore;
  let page: number;
  const context = { drawImage: vi.fn(), getImageData: vi.fn() };
  const fonts = { load: vi.fn(), check: vi.fn() };
  const prepare = () => preparePageAssets(capturePageExport(page, (id) => store.get(id)));
  const child = (type: "image" | "text" | "graphic" | "group") => {
    const id = store.create(type);
    store.appendChild(page, id);
    return id;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    store = new BlockStore();
    page = store.create("page");
    loadImageMock.mockResolvedValue({});
    fonts.load.mockResolvedValue([]);
    fonts.check.mockReturnValue(true);
    vi.stubGlobal("document", {
      fonts,
      createElement: () => ({ width: 0, height: 0, getContext: () => context }),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("waits for page images, image blocks, and enabled image fills", async () => {
    store.setProperty(page, IMAGE_SRC, "background.png");
    const image = child("image");
    store.setProperty(image, IMAGE_SRC, "image.png");
    const graphic = child("graphic");
    const fill = store.create("fill", "image");
    store.get(graphic)!.fillId = fill;
    store.setProperty(fill, FILL_IMAGE_SRC, "fill.png");
    const releases: (() => void)[] = [];
    loadImageMock.mockImplementation(() => new Promise<void>((resolve) => releases.push(resolve)));
    const pending = prepare();
    expect(loadImageMock.mock.calls.map(([src]) => src)).toEqual([
      "background.png",
      "image.png",
      "fill.png",
    ]);
    let finished = false;
    pending.then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    for (const release of releases) release();
    await pending;
    expect(context.getImageData).toHaveBeenCalledTimes(3);
  });

  it.each(["network", "CORS"])("identifies %s image failures", async (mode) => {
    const image = child("image");
    store.setProperty(image, IMAGE_SRC, "bad.png");
    const cause = new Error(mode);
    if (mode === "network") loadImageMock.mockRejectedValue(cause);
    else
      context.getImageData.mockImplementation(() => {
        throw cause;
      });
    await expect(prepare()).rejects.toMatchObject({
      code: "IMAGE_LOAD_FAILED",
      pageId: page,
      blockId: image,
      resource: "bad.png",
      cause,
    });
  });

  it("rejects missing image sources explicitly", async () => {
    const image = child("image");
    await expect(prepare()).rejects.toMatchObject({ code: "IMAGE_LOAD_FAILED", blockId: image });
  });

  it("ignores other pages, hidden ancestry, zero opacity, and disabled fills", async () => {
    const other = store.create("page");
    store.setProperty(other, IMAGE_SRC, "other.png");
    const hidden = child("group");
    store.setProperty(hidden, VISIBLE, false);
    const missing = store.create("image");
    store.appendChild(hidden, missing);
    const transparent = child("image");
    store.setProperty(transparent, OPACITY, 0);
    const graphic = child("graphic");
    const fill = store.create("fill", "image");
    store.get(graphic)!.fillId = fill;
    store.setProperty(graphic, FILL_ENABLED, false);
    await prepare();
    expect(loadImageMock).not.toHaveBeenCalled();
    expect(fonts.load).not.toHaveBeenCalled();
  });

  it("loads each used styled run and its transformed glyphs before measuring", async () => {
    const text = child("text");
    store.setProperty(text, TEXT_RUNS, [
      {
        text: "Hello",
        style: {
          fontFamily: "Test Font",
          fontSize: 32,
          fontWeight: "700",
          fontStyle: "italic",
          textTransform: "uppercase",
        },
      },
      { text: "World", style: {} },
    ]);
    const releases: (() => void)[] = [];
    fonts.load.mockImplementation(() => new Promise<void>((resolve) => releases.push(resolve)));
    const pending = prepare();
    expect(fonts.load).toHaveBeenCalledWith('italic 700 32px "Test Font"', "HELLO");
    expect(fonts.load).toHaveBeenCalledWith("normal normal 16px Arial", "World");
    expect(fonts.check).not.toHaveBeenCalled();
    for (const release of releases) release();
    await pending;
    expect(fonts.check).toHaveBeenCalledTimes(2);
  });

  it.each(["load", "check"])("identifies font %s failures", async (mode) => {
    const text = child("text");
    store.setProperty(text, TEXT_RUNS, [{ text: "Hi", style: { fontFamily: "Broken Font" } }]);
    if (mode === "load") fonts.load.mockRejectedValue(new Error("font failed"));
    else fonts.check.mockReturnValue(false);
    await expect(prepare()).rejects.toMatchObject({
      code: "FONT_LOAD_FAILED",
      pageId: page,
      blockId: text,
      resource: "Broken Font",
    });
  });

  it("waits for node image processing, including page-background nodes", async () => {
    const root = new Konva.Group();
    root.setAttr("blockId", page);
    const image = new Konva.Group();
    image.setAttr("__pendingSrc", "page.png");
    root.add(image);
    let release!: () => void;
    image.setAttr(
      "__imageReady",
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const pending = waitForPageNodes(page, root);
    image.setAttr("__imageLoadError", new Error("processing failed"));
    release();
    await expect(pending).rejects.toMatchObject({
      code: "IMAGE_LOAD_FAILED",
      pageId: page,
      blockId: page,
      resource: "page.png",
    });
    root.destroy();
  });
});
