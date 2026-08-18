import { act, cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { useImageEditorStore } from "../../store/image-editor-store";
import { CanvasPane } from "./canvas-pane";

// The overlay talks to the real engine text-editing session; stub it so these
// tests can focus on the dblclick gating (does the editor open at all?).
vi.mock("../text-editor-overlay", () => ({ TextEditorOverlay: () => null }));
vi.mock("../../hooks/use-block-screen-rect", () => ({
  useBlockScreenRect: () => ({ x: 10, y: 20, width: 100, height: 50 }),
}));
vi.mock("./block-properties-bar", () => ({
  BlockPropertiesBar: ({ blockType }: { blockType: string }) => (
    <div data-testid="properties-bar">{blockType}</div>
  ),
}));
vi.mock("./canvas-block-overlay", () => ({
  CanvasBlockOverlay: (props: { onReplaceImage?: (file: File) => void }) => (
    <div data-testid="block-overlay" data-can-replace={Boolean(props.onReplaceImage)} />
  ),
}));

afterEach(() => {
  cleanup();
  useImageEditorStore.setState({ editingTextBlockId: null });
});

type DblClickCb = (blockId: number, pos: { x: number; y: number }) => void;

/** Minimal engine mock capturing the dblclick handler + group-context queries. */
function makeEngine(opts: {
  type: string;
  parent: number | null;
  context: number[];
  imageFill?: { src: string } | null;
}) {
  let dblCb: DblClickCb | null = null;
  return {
    engine: {
      on: vi.fn(),
      off: vi.fn(),
      onHistoryChanged: () => () => {},
      block: {
        onBlockDoubleClick: (cb: DblClickCb) => {
          dblCb = cb;
          return () => {};
        },
        getType: () => opts.type,
        getParent: () => opts.parent,
        getGroupContext: () => opts.context,
        getFillImage: () => opts.imageFill ?? null,
        onStateChanged: () => () => {},
        select: vi.fn(),
      },
    },
    fire: (blockId: number) => dblCb?.(blockId, { x: 0, y: 0 }),
  };
}

function renderPane(engine: unknown) {
  render(
    React.createElement(
      ImageEditorProvider,
      null,
      React.createElement(CanvasPane, {
        canvasRef: React.createRef<HTMLDivElement>(),
        engine: engine as never,
        activeTool: "select",
        selectedShapeId: null,
        selectedBlockType: null,
        hasSelectedBlock: false,
        blockActions: {} as never,
        rotateFlip: {
          handleRotateClockwise: vi.fn(),
          handleRotateCounterClockwise: vi.fn(),
          handleFlipHorizontal: vi.fn(),
          handleFlipVertical: vi.fn(),
        },
        replaceImage: vi.fn(),
        onContextualReset: vi.fn(),
        onDone: vi.fn(),
      }),
    ),
  );
}

describe("CanvasPane dblclick gating", () => {
  it("routes Replace to the overlay only for an image-filled graphic", () => {
    const renderGraphic = (imageFill: { src: string } | null) => {
      const mock = makeEngine({ type: "graphic", parent: 1, context: [], imageFill });
      return render(
        <ImageEditorProvider>
          <CanvasPane
            canvasRef={React.createRef<HTMLDivElement>()}
            engine={mock.engine as never}
            activeTool="select"
            selectedShapeId={7}
            selectedBlockType="graphic"
            hasSelectedBlock
            blockActions={{} as never}
            rotateFlip={{
              handleRotateClockwise: vi.fn(),
              handleRotateCounterClockwise: vi.fn(),
              handleFlipHorizontal: vi.fn(),
              handleFlipVertical: vi.fn(),
            }}
            replaceImage={vi.fn()}
            onContextualReset={vi.fn()}
            onDone={vi.fn()}
          />
        </ImageEditorProvider>,
      );
    };

    const imageGraphic = renderGraphic({ src: "fill.png" });
    expect(imageGraphic.getByTestId("block-overlay").dataset.canReplace).toBe("true");
    imageGraphic.unmount();

    const colorGraphic = renderGraphic(null);
    expect(colorGraphic.getByTestId("block-overlay").dataset.canReplace).toBe("false");
  });

  it("shows the contextual header and action overlay for a group", () => {
    const mock = makeEngine({ type: "group", parent: 1, context: [] });
    const { getByTestId } = render(
      <ImageEditorProvider>
        <CanvasPane
          canvasRef={React.createRef<HTMLDivElement>()}
          engine={mock.engine as never}
          activeTool="select"
          selectedShapeId={7}
          selectedBlockType="group"
          hasSelectedBlock
          blockActions={{} as never}
          rotateFlip={{
            handleRotateClockwise: vi.fn(),
            handleRotateCounterClockwise: vi.fn(),
            handleFlipHorizontal: vi.fn(),
            handleFlipVertical: vi.fn(),
          }}
          replaceImage={vi.fn()}
          onContextualReset={vi.fn()}
          onDone={vi.fn()}
        />
      </ImageEditorProvider>,
    );

    expect(getByTestId("properties-bar").textContent).toBe("group");
    expect(getByTestId("block-overlay")).toBeDefined();
  });

  it("REGRESSION: an ungrouped text block opens the editor on the first dblclick", () => {
    // Top-level text (no group context, parent is the page → not a group).
    const mock = makeEngine({ type: "text", parent: 1, context: [] });
    // getType is asked for both the block and its parent; both return "text"
    // here, and since the parent is not "group", the editor must open.
    renderPane(mock.engine);

    act(() => mock.fire(42));
    expect(useImageEditorStore.getState().editingTextBlockId).toBe(42);
  });

  it("does not open the editor for a grouped text block outside the active context", () => {
    // Text nested in a group, but no group context is active yet (first dblclick
    // should enter the group via the engine, not open the editor).
    const engine = {
      on: vi.fn(),
      off: vi.fn(),
      block: {
        onBlockDoubleClick: (cb: DblClickCb) => {
          (engine as unknown as { _cb: DblClickCb })._cb = cb;
          return () => {};
        },
        getType: (id: number) => (id === 42 ? "text" : "group"),
        getParent: () => 7,
        getGroupContext: () => [] as number[],
        select: vi.fn(),
      },
    };
    render(
      React.createElement(
        ImageEditorProvider,
        null,
        React.createElement(CanvasPane, {
          canvasRef: React.createRef<HTMLDivElement>(),
          engine: engine as never,
          activeTool: "select",
          selectedShapeId: null,
          selectedBlockType: null,
          hasSelectedBlock: false,
          blockActions: {} as never,
          rotateFlip: {
            handleRotateClockwise: vi.fn(),
            handleRotateCounterClockwise: vi.fn(),
            handleFlipHorizontal: vi.fn(),
            handleFlipVertical: vi.fn(),
          },
          replaceImage: vi.fn(),
          onContextualReset: vi.fn(),
          onDone: vi.fn(),
        }),
      ),
    );

    act(() => (engine as unknown as { _cb: DblClickCb })._cb(42, { x: 0, y: 0 }));
    expect(useImageEditorStore.getState().editingTextBlockId).toBeNull();
  });

  it("opens the editor for a direct child of the active group context", () => {
    const mock = makeEngine({ type: "text", parent: 7, context: [7] });
    renderPane(mock.engine);

    act(() => mock.fire(42));
    expect(useImageEditorStore.getState().editingTextBlockId).toBe(42);
  });
});
