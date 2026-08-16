import type { EditxEngine } from "@editx/engine";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { useImageEditorStore } from "../../store/image-editor-store";
import { ShadowPropertyPanel } from "./shadow-property-panel";

/**
 * Regression for the text-property-model split: a "Shadow" text preset writes
 * the shadow into the TEXT-RUN style (`textShadow*`). The Shadow panel must read
 * THAT run style for text blocks (not the separate block-level SHADOW_* system),
 * so preset shadows show up as enabled with their real values instead of
 * disabled/zero.
 */
function makeEngine(run: Record<string, unknown>) {
  const block = {
    getTextRuns: vi.fn().mockReturnValue([{ text: "Hi", style: run }]),
    getTextContent: vi.fn().mockReturnValue("Hi"),
    setTextShadow: vi.fn(),
    // Block-level reads exist on the panel's unused (graphic) branch.
    getShadowColor: vi.fn().mockReturnValue(null),
    isShadowEnabled: vi.fn().mockReturnValue(false),
    getShadowOffsetX: vi.fn().mockReturnValue(0),
    getShadowOffsetY: vi.fn().mockReturnValue(0),
    getShadowBlur: vi.fn().mockReturnValue(0),
  };
  const engine = {
    block,
    onHistoryChanged: vi.fn().mockReturnValue(() => {}),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  };
  return engine as unknown as EditxEngine;
}

function makeGraphicEngine() {
  const block = {
    getShadowColor: vi.fn().mockReturnValue({ r: 0, g: 0, b: 0, a: 0 }),
    isShadowEnabled: vi.fn().mockReturnValue(true),
    getShadowOffsetX: vi.fn().mockReturnValue(0),
    getShadowOffsetY: vi.fn().mockReturnValue(0),
    getShadowBlur: vi.fn().mockReturnValue(0),
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

function renderPanel(engine: EditxEngine) {
  return render(
    <ImageEditorProvider>
      <ShadowPropertyPanel engine={engine} blockId={7} blockType="text" />
    </ImageEditorProvider>,
  );
}

describe("ShadowPropertyPanel (text block)", () => {
  beforeEach(() => {
    useImageEditorStore.setState({ textSelectionRange: null, editingTextBlockId: null });
  });

  afterEach(cleanup);

  it("reflects the run's shadow values from a preset", () => {
    const engine = makeEngine({
      textShadowColor: "#ff0000",
      textShadowBlur: 8,
      textShadowOffsetX: 3,
      textShadowOffsetY: 4,
    });
    const { container } = renderPanel(engine);

    expect(screen.queryByRole("switch", { name: "Enable Shadow" })).toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe("FF0000");
    expect(screen.getByText("Default Colors")).toBeDefined();
  });

  it("keeps disabled text shadow controls mounted with reduced opacity", () => {
    const engine = makeEngine({ fontSize: 24 });
    const { container } = renderPanel(engine);

    expect(screen.queryByRole("switch", { name: "Enable Shadow" })).toBeNull();
    expect(screen.getByText("Blur")).toBeDefined();
    expect(container.firstElementChild?.classList.contains("opacity-50")).toBe(true);
  });

  it("renders a transparent engine shadow as a valid opaque color control", () => {
    const { container } = render(
      <ImageEditorProvider>
        <ShadowPropertyPanel engine={makeGraphicEngine()} blockId={7} blockType="graphic" />
      </ImageEditorProvider>,
    );

    expect(container.querySelector<HTMLInputElement>('input[type="color"]')?.value).toBe("#000000");
    expect(container.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe("000000");
    expect(screen.queryByText("rgba(0,")).toBeNull();
  });

  it("reads graphic shadow opacity from the color alpha", () => {
    const { container } = render(
      <ImageEditorProvider>
        <ShadowPropertyPanel engine={makeGraphicEngine()} blockId={7} blockType="graphic" />
      </ImageEditorProvider>,
    );
    const opacity = container.querySelector<HTMLInputElement>('input[type="range"]');
    if (!opacity) throw new Error("Shadow opacity slider was not rendered");

    expect(opacity.value).toBe("0");
  });

  it("reads text shadow opacity from the run color", () => {
    const engine = makeEngine({ textShadowColor: "#ff0000" });
    const { container } = renderPanel(engine);
    const opacity = container.querySelector<HTMLInputElement>('input[type="range"]');
    if (!opacity) throw new Error("Text shadow opacity slider was not rendered");

    expect(opacity.value).toBe("1");
  });
});
