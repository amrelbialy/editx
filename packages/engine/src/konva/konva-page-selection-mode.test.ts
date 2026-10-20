import type Konva from "konva";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RendererPageView } from "../page-view";
import { KonvaRendererBlocks } from "./konva-renderer-blocks";
import type { KonvaRendererContext } from "./konva-renderer-context";

vi.mock("./konva-page-view", () => ({
  KonvaPageView: class {
    mode = "all-pages";
    set(view: RendererPageView) {
      this.mode = view.mode;
    }
    isContinuous() {
      return this.mode === "vertical-pages" || this.mode === "horizontal-pages";
    }
    remove() {}
  },
}));

function view(mode: "vertical-pages" | "horizontal-pages"): RendererPageView {
  return { mode, activePageId: 7, pages: [{ id: 7, width: 100, height: 80 }] };
}

describe("page selection transformer across page-view modes", () => {
  let blocks: KonvaRendererBlocks;
  let pageVisible: boolean;
  let artworkVisible: boolean;
  let page: Konva.Node;
  let artwork: Konva.Node;
  let selectedNodes: Konva.Node[];
  let clearHover: ReturnType<typeof vi.fn>;
  let transformer: {
    nodes: ReturnType<typeof vi.fn>;
    enabledAnchors: ReturnType<typeof vi.fn>;
    keepRatio: ReturnType<typeof vi.fn>;
    flipEnabled: ReturnType<typeof vi.fn>;
    rotateEnabled: ReturnType<typeof vi.fn>;
    listening: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    pageVisible = true;
    artworkVisible = true;
    page = { isVisible: () => pageVisible, destroy: vi.fn() } as unknown as Konva.Node;
    artwork = { isVisible: () => artworkVisible, destroy: vi.fn() } as unknown as Konva.Node;
    selectedNodes = [];
    clearHover = vi.fn();
    transformer = {
      nodes: vi.fn((nodes?: Konva.Node[]) => {
        if (nodes) selectedNodes = nodes;
        return selectedNodes;
      }),
      enabledAnchors: vi.fn(),
      keepRatio: vi.fn(),
      flipEnabled: vi.fn(),
      rotateEnabled: vi.fn(),
      listening: vi.fn(),
    };
    const context = {
      nodeMap: new Map([
        [7, page],
        [9, artwork],
      ]),
      transformer,
      hoverOutline: { hide: vi.fn(), clearNode: clearHover },
      uiLayer: { batchDraw: vi.fn() },
      imageFillCrop: { isActive: () => false },
    } as unknown as KonvaRendererContext;
    blocks = new KonvaRendererBlocks(context);
  });

  function expectOutlineOnlyPage(): void {
    expect(selectedNodes).toEqual([page]);
    expect(transformer.enabledAnchors).toHaveBeenLastCalledWith([]);
    expect(transformer.rotateEnabled).toHaveBeenLastCalledWith(false);
    expect(transformer.listening).toHaveBeenLastCalledWith(false);
  }

  function expectNormalControls(node: Konva.Node): void {
    expect(selectedNodes).toEqual([node]);
    expect(transformer.enabledAnchors).toHaveBeenLastCalledWith([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "middle-left",
      "middle-right",
      "top-center",
      "bottom-center",
    ]);
    expect(transformer.rotateEnabled).toHaveBeenLastCalledWith(true);
    expect(transformer.listening).toHaveBeenLastCalledWith(true);
  }

  it("recalculates a selected page for continuous and legacy modes", () => {
    blocks.showTransformer([7], "page");
    expectNormalControls(page);

    blocks.setPageView(view("vertical-pages"));
    expectOutlineOnlyPage();
    blocks.setPageView(view("horizontal-pages"));
    expectOutlineOnlyPage();

    blocks.setPageView({ mode: "all-pages" });
    expectNormalControls(page);
    blocks.setPageView({ mode: "active-page", activePageId: 7 });
    expectNormalControls(page);

    blocks.setPageView(view("vertical-pages"));
    expectOutlineOnlyPage();
  });

  it("preserves artwork selection and controls across continuous configurations", () => {
    blocks.showTransformer([9], "graphic");
    blocks.setPageView(view("vertical-pages"));
    expectNormalControls(artwork);
    blocks.setPageView(view("horizontal-pages"));
    expectNormalControls(artwork);
  });

  it("reattaches a still-selected page after temporary view filtering", () => {
    blocks.showTransformer([7], "page");
    pageVisible = false;
    blocks.setPageView({ mode: "active-page", activePageId: 9 });
    expect(selectedNodes).toEqual([]);

    pageVisible = true;
    blocks.setPageView(view("vertical-pages"));
    expectOutlineOnlyPage();
  });

  it("clears hover for a removed node before destroying it", () => {
    clearHover.mockImplementationOnce(() => expect(page.destroy).not.toHaveBeenCalled());

    blocks.removeBlock(7);

    expect(clearHover).toHaveBeenCalledWith(page);
    expect(page.destroy).toHaveBeenCalledOnce();
  });
});
