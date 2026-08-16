import type { EditxEngine, StrokeGradient } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { StrokePropertyPanel } from "./stroke-property-panel";

function makeEngine(
  strokeColor = { r: 0.2, g: 0.4, b: 0.6, a: 1 },
  gradient: StrokeGradient | null = null,
) {
  const onHistoryChanged = vi.fn().mockReturnValue(() => undefined);
  const block = {
    isStrokeEnabled: vi.fn().mockReturnValue(false),
    getStrokeColor: vi.fn().mockReturnValue(strokeColor),
    getStrokeWidth: vi.fn().mockReturnValue(2),
    getStrokeGradient: vi.fn().mockReturnValue(gradient),
    setStrokeColor: vi.fn(),
    setStrokeWidth: vi.fn(),
    setStrokeGradient: vi.fn(),
  };
  const engine = {
    block,
    onHistoryChanged,
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
    notifyHistory: () => {
      const listener = onHistoryChanged.mock.calls.at(-1)?.[0] as (() => void) | undefined;
      listener?.();
    },
  };
  return engine as unknown as EditxEngine & {
    block: typeof block;
    notifyHistory: () => void;
  };
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
    expect(container.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe("000000");
    expect(screen.getByText("Default Colors")).toBeDefined();
    expect(screen.queryByText("rgba(0,")).toBeNull();
  });

  it("reads stroke opacity from the color alpha", () => {
    const { container } = render(
      <ImageEditorProvider>
        <StrokePropertyPanel engine={makeEngine()} blockId={7} blockType="graphic" />
      </ImageEditorProvider>,
    );
    const opacity = container.querySelector<HTMLInputElement>('input[type="range"]');
    if (!opacity) throw new Error("Stroke opacity slider was not rendered");

    expect(opacity.value).toBe("1");
  });

  it("switches to a linear gradient and applies angle and stop mutations", () => {
    const engine = makeEngine();
    const { container } = render(
      <ImageEditorProvider>
        <StrokePropertyPanel engine={engine} blockId={7} blockType="graphic" />
      </ImageEditorProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Gradient" }));
    expect(engine.block.setStrokeGradient).toHaveBeenCalledWith(7, {
      type: "linear",
      angle: 0,
      stops: [
        { offset: 0, color: "#336699" },
        { offset: 1, color: "#ffffff" },
      ],
    });
    expect(screen.queryByRole("tablist", { name: "Gradient type" })).toBeNull();

    fireEvent.change(container.querySelector('input[type="number"]') as HTMLInputElement, {
      target: { value: "45" },
    });
    const colorInputs = container.querySelectorAll<HTMLInputElement>('input[type="color"]');
    fireEvent.change(colorInputs[1], { target: { value: "#00ff00" } });

    expect(engine.block.setStrokeGradient).toHaveBeenLastCalledWith(7, {
      type: "linear",
      angle: 45,
      stops: [
        { offset: 0, color: "#336699" },
        { offset: 1, color: "#00ff00" },
      ],
    });
  });

  it("keeps Color selected while history still reports the previous gradient", () => {
    const engine = makeEngine(undefined, {
      type: "linear",
      angle: 0,
      stops: [
        { offset: 0, color: "#336699" },
        { offset: 1, color: "#ffffff" },
      ],
    });
    render(
      <ImageEditorProvider>
        <StrokePropertyPanel engine={engine} blockId={7} blockType="graphic" />
      </ImageEditorProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Color" }));
    engine.notifyHistory();

    expect(screen.getByRole("tab", { name: "Color" }).getAttribute("aria-selected")).toBe("true");
  });

  it("restores gradient stops and opacity after visiting Color", () => {
    const gradient: StrokeGradient = {
      type: "linear",
      angle: 35,
      stops: [
        { offset: 0, color: "#ff000066" },
        { offset: 1, color: "#00ff0066" },
      ],
    };
    const engine = makeEngine(undefined, gradient);
    render(
      <ImageEditorProvider>
        <StrokePropertyPanel engine={engine} blockId={7} blockType="graphic" />
      </ImageEditorProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Color" }));
    engine.block.getStrokeGradient.mockReturnValue(null);
    engine.notifyHistory();
    fireEvent.click(screen.getByRole("tab", { name: "Gradient" }));

    expect(engine.block.setStrokeGradient).toHaveBeenLastCalledWith(7, {
      ...gradient,
      stops: [
        { offset: 0, color: "rgba(255,0,0,0.4)" },
        { offset: 1, color: "rgba(0,255,0,0.4)" },
      ],
    });
  });

  it("keeps image strokes on the supported solid color controls", () => {
    render(
      <ImageEditorProvider>
        <StrokePropertyPanel engine={makeEngine()} blockId={7} blockType="image" />
      </ImageEditorProvider>,
    );

    expect(screen.queryByRole("tab", { name: "Gradient" })).toBeNull();
    expect(screen.getByRole("switch", { name: "Enable Stroke" })).toBeDefined();
  });
});
