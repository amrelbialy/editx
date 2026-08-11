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

  it("reflects the run's shadow values from a preset (enabled + real values)", () => {
    const engine = makeEngine({
      textShadowColor: "#ff0000",
      textShadowBlur: 8,
      textShadowOffsetX: 3,
      textShadowOffsetY: 4,
    });
    renderPanel(engine);

    // Switch is ON because the run carries a shadow.
    expect(screen.getByRole("switch", { name: "Enable Shadow" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    // The preset colour is surfaced, not "#000000"/disabled.
    expect(screen.getByText("#ff0000")).toBeDefined();
  });

  it("shows a disabled switch when the run carries no shadow", () => {
    const engine = makeEngine({ fontSize: 24 });
    renderPanel(engine);

    expect(screen.getByRole("switch", { name: "Enable Shadow" }).getAttribute("aria-checked")).toBe(
      "false",
    );
  });
});
