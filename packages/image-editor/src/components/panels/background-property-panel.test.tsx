import type { EditxEngine } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { I18nProvider } from "../../i18n/i18n-context";
import { useImageEditorStore } from "../../store/image-editor-store";
import { BackgroundPropertyPanel } from "./background-property-panel";

const RESOLVED_BOX = {
  enabled: false,
  color: { r: 0, g: 0, b: 0, a: 1 },
  cornerRadius: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
};

/**
 * The Background panel edits the RUN-level `backgroundColor` (the highlight pill)
 * for TEXT blocks — text presets set the run background, not the whole-box fill.
 * Graphic blocks keep the block-level fill path.
 */
function makeTextEngine(run: Record<string, unknown>) {
  const block = {
    getTextRuns: vi.fn().mockReturnValue([{ text: "Hi", style: run }]),
    getTextContent: vi.fn().mockReturnValue("Hi"),
    setTextBackgroundColor: vi.fn(),
    // Block-level background box (rendered alongside the highlight).
    supportsTextBackground: vi.fn().mockReturnValue(true),
    getTextBackground: vi.fn().mockReturnValue(RESOLVED_BOX),
    setTextBackground: vi.fn(),
    setTextBackgroundEnabled: vi.fn(),
    getTextCurve: vi.fn().mockReturnValue(null),
    // Unused block-level branch (graphic).
    isFillEnabled: vi.fn().mockReturnValue(false),
    getFill: vi.fn().mockReturnValue(null),
    getColor: vi.fn().mockReturnValue(null),
    setFillEnabled: vi.fn(),
    setColor: vi.fn(),
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

function makeGraphicEngine() {
  const block = {
    isFillEnabled: vi.fn().mockReturnValue(true),
    getFill: vi.fn().mockReturnValue(42),
    getColor: vi.fn().mockReturnValue(null),
    setFillEnabled: vi.fn(),
    setColor: vi.fn(),
    getTextRuns: vi.fn().mockReturnValue([]),
    getTextContent: vi.fn().mockReturnValue(""),
    setTextBackgroundColor: vi.fn(),
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

function renderPanel(engine: EditxEngine, blockType: "text" | "graphic") {
  return render(
    <I18nProvider>
      <ImageEditorProvider>
        <BackgroundPropertyPanel engine={engine} blockId={7} blockType={blockType} />
      </ImageEditorProvider>
    </I18nProvider>,
  );
}

describe("BackgroundPropertyPanel", () => {
  beforeEach(() => {
    useImageEditorStore.setState({ textSelectionRange: null, editingTextBlockId: null });
  });

  afterEach(cleanup);

  it("reads the run's backgroundColor as enabled for a text block", () => {
    const engine = makeTextEngine({ backgroundColor: "#fde68a" });
    renderPanel(engine, "text");

    expect(
      screen.getByRole("switch", { name: "Enable Background" }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("shows disabled when the text run has no backgroundColor", () => {
    const engine = makeTextEngine({ fontSize: 24 });
    renderPanel(engine, "text");

    expect(
      screen.getByRole("switch", { name: "Enable Background" }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("toggles the highlight ON via setTextBackgroundColor for text", () => {
    const engine = makeTextEngine({ fontSize: 24 });
    renderPanel(engine, "text");

    fireEvent.click(screen.getByRole("switch", { name: "Enable Background" }));

    expect(engine.block.setTextBackgroundColor).toHaveBeenCalledTimes(1);
    const [id, start, end, color] = engine.block.setTextBackgroundColor.mock.calls[0];
    expect(id).toBe(7);
    expect(start).toBe(0);
    expect(end).toBe(2);
    expect(color).toBe("#FDE68A");
  });

  it("toggles the highlight OFF via setTextBackgroundColor(undefined)", () => {
    const engine = makeTextEngine({ backgroundColor: "#fde68a" });
    renderPanel(engine, "text");

    fireEvent.click(screen.getByRole("switch", { name: "Enable Background" }));

    const [, , , color] = engine.block.setTextBackgroundColor.mock.calls[0];
    expect(color).toBeUndefined();
  });

  it("keeps the block-level fill path for graphic blocks", () => {
    const engine = makeGraphicEngine();
    renderPanel(engine, "graphic");

    // Graphic path never touches the run-level API.
    expect(engine.block.setTextBackgroundColor).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("switch", { name: "Enable Background" }));
    expect(engine.block.setFillEnabled).toHaveBeenCalledWith(7, false);
  });
});
