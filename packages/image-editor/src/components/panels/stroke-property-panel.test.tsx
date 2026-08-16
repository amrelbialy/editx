import type { EditxEngine } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { StrokePropertyPanel } from "./stroke-property-panel";

function makeEngine(strokeColor = { r: 0.2, g: 0.4, b: 0.6, a: 1 }) {
  const block = {
    isStrokeEnabled: vi.fn().mockReturnValue(false),
    getStrokeColor: vi.fn().mockReturnValue(strokeColor),
    getStrokeWidth: vi.fn().mockReturnValue(2),
    setStrokeColor: vi.fn(),
    setStrokeWidth: vi.fn(),
  };
  const engine = {
    block,
    onHistoryChanged: vi.fn().mockReturnValue(() => {}),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  };
  return engine as unknown as EditxEngine & { block: typeof block };
}

describe("StrokePropertyPanel (graphic block)", () => {
  afterEach(cleanup);

  it("keeps disabled stroke controls mounted, muted, and usable", () => {
    const engine = makeEngine();
    const { container } = render(
      <ImageEditorProvider>
        <StrokePropertyPanel engine={engine} blockId={7} blockType="graphic" enabled={false} />
      </ImageEditorProvider>,
    );

    expect(screen.queryByRole("switch", { name: "Enable Stroke" })).toBeNull();
    expect(screen.getByText("Width")).toBeDefined();
    expect(container.firstElementChild?.classList.contains("opacity-50")).toBe(true);

    fireEvent.change(container.querySelector('input[type="color"]') as HTMLInputElement, {
      target: { value: "#123456" },
    });

    expect(engine.block.setStrokeColor).toHaveBeenCalledWith(7, {
      r: 0x12 / 255,
      g: 0x34 / 255,
      b: 0x56 / 255,
      a: 1,
    });
  });

  it("renders a transparent engine stroke as a valid opaque color control", () => {
    const engine = makeEngine({ r: 0, g: 0, b: 0, a: 0 });
    const { container } = render(
      <ImageEditorProvider>
        <StrokePropertyPanel engine={engine} blockId={7} blockType="graphic" />
      </ImageEditorProvider>,
    );

    expect(container.querySelector<HTMLInputElement>('input[type="color"]')?.value).toBe("#000000");
    expect(screen.getByText("#000000")).toBeDefined();
    expect(screen.queryByText("rgba(0,")).toBeNull();
  });
});
