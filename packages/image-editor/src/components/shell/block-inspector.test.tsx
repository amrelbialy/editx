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
  });
});
