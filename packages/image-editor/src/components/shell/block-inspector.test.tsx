import type { EditxEngine } from "@editx/engine";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlockInspector } from "./block-inspector";

vi.mock("../panels/position-property-panel", () => ({
  PositionPropertyPanel: (props: { blockId: number; onBringForward: () => void }) => (
    <div data-block-id={props.blockId} data-testid="position-panel">
      Position
    </div>
  ),
}));

vi.mock("../panels/shape-replace-panel.component", () => ({
  ShapeReplacePanel: (props: { blockId: number }) => (
    <div data-block-id={props.blockId} data-testid="shape-panel" />
  ),
}));

vi.mock("../panels/adjust-panel", () => ({
  AdjustPanel: () => <div data-testid="adjust-panel" />,
}));

vi.mock("../panels/filter-panel", () => ({
  FilterPanel: () => <div data-testid="filter-panel" />,
}));

afterEach(cleanup);

describe("BlockInspector", () => {
  it("routes a selected group to the Position property panel", () => {
    const blockActions = {
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      bringToFront: vi.fn(),
      sendToBack: vi.fn(),
      alignToPage: vi.fn(),
    };

    render(
      <BlockInspector
        panel="position"
        engine={{} as EditxEngine}
        blockId={7}
        blockType="group"
        blockEffects={{
          adjustValues: {},
          handleAdjustChange: vi.fn(),
          handleAdjustCommit: vi.fn(),
          handleAdjustReset: vi.fn(),
          activeFilter: "none",
          handleFilterSelect: vi.fn(),
        }}
        blockActions={blockActions}
        onReplaceImage={vi.fn()}
      />,
    );

    expect(screen.getByTestId("position-panel").dataset.blockId).toBe("7");
    expect(screen.queryByTestId("shape-geometry")).toBeNull();
  });

  it("keeps Position focused on layout for graphics", () => {
    render(
      <BlockInspector
        panel="position"
        engine={{} as EditxEngine}
        blockId={11}
        blockType="graphic"
        blockEffects={{
          adjustValues: {},
          handleAdjustChange: vi.fn(),
          handleAdjustCommit: vi.fn(),
          handleAdjustReset: vi.fn(),
          activeFilter: "none",
          handleFilterSelect: vi.fn(),
        }}
        blockActions={{
          bringForward: vi.fn(),
          sendBackward: vi.fn(),
          bringToFront: vi.fn(),
          sendToBack: vi.fn(),
          alignToPage: vi.fn(),
        }}
        onReplaceImage={vi.fn()}
      />,
    );

    expect(screen.getByTestId("position-panel")).toBeTruthy();
    expect(screen.queryByTestId("shape-panel")).toBeNull();
  });

  it("routes graphics to the dedicated Shape panel", () => {
    render(
      <BlockInspector
        panel="shape"
        engine={{} as EditxEngine}
        blockId={11}
        blockType="graphic"
        blockEffects={{
          adjustValues: {},
          handleAdjustChange: vi.fn(),
          handleAdjustCommit: vi.fn(),
          handleAdjustReset: vi.fn(),
          activeFilter: "none",
          handleFilterSelect: vi.fn(),
        }}
        blockActions={{
          bringForward: vi.fn(),
          sendBackward: vi.fn(),
          bringToFront: vi.fn(),
          sendToBack: vi.fn(),
          alignToPage: vi.fn(),
        }}
        onReplaceImage={vi.fn()}
      />,
    );

    expect(screen.getByTestId("shape-panel").dataset.blockId).toBe("11");
  });

  it.each(["adjust", "filter"] as const)("routes a graphic image fill to the %s panel", (panel) => {
    const engine = {
      block: { getFillImage: vi.fn(() => ({ src: "fill.png" })) },
    } as unknown as EditxEngine;

    render(
      <BlockInspector
        panel={panel}
        engine={engine}
        blockId={11}
        blockType="graphic"
        blockEffects={{
          adjustValues: {},
          handleAdjustChange: vi.fn(),
          handleAdjustCommit: vi.fn(),
          handleAdjustReset: vi.fn(),
          activeFilter: "none",
          handleFilterSelect: vi.fn(),
        }}
        blockActions={{
          bringForward: vi.fn(),
          sendBackward: vi.fn(),
          bringToFront: vi.fn(),
          sendToBack: vi.fn(),
          alignToPage: vi.fn(),
        }}
        onReplaceImage={vi.fn()}
      />,
    );

    expect(screen.getByTestId(`${panel}-panel`)).toBeDefined();
    expect(engine.block.getFillImage).toHaveBeenCalledWith(11);
  });

  it("does not route graphic color fills to image effect panels", () => {
    const engine = {
      block: { getFillImage: vi.fn(() => null) },
    } as unknown as EditxEngine;

    const { container } = render(
      <BlockInspector
        panel="adjust"
        engine={engine}
        blockId={11}
        blockType="graphic"
        blockEffects={{
          adjustValues: {},
          handleAdjustChange: vi.fn(),
          handleAdjustCommit: vi.fn(),
          handleAdjustReset: vi.fn(),
          activeFilter: "none",
          handleFilterSelect: vi.fn(),
        }}
        blockActions={{
          bringForward: vi.fn(),
          sendBackward: vi.fn(),
          bringToFront: vi.fn(),
          sendToBack: vi.fn(),
          alignToPage: vi.fn(),
        }}
        onReplaceImage={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
