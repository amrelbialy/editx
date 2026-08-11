import type { EditxEngine } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../../config/config-context";
import { I18nProvider } from "../../../i18n/i18n-context";
import { useImageEditorStore } from "../../../store/image-editor-store";
import { TooltipProvider } from "../../ui";
import { BlockPropertiesBar } from "./block-properties-bar.component";

/**
 * Engine double covering only the reads/mutations the properties bar performs.
 * All document mutations are exposed as spies so tests assert they route
 * through the engine (mirrors production undoability).
 */
function makeEngine() {
  const block = {
    getTextRuns: vi.fn().mockReturnValue([{ text: "Hello", style: {} }]),
    getString: vi.fn().mockReturnValue("left"),
    getOpacity: vi.fn().mockReturnValue(1),
    getTextContent: vi.fn().mockReturnValue("Hello"),
    getFill: vi.fn().mockReturnValue(null),
    getColor: vi.fn().mockReturnValue(null),
    isFillEnabled: vi.fn().mockReturnValue(true),
    setFillEnabled: vi.fn(),
    setOpacity: vi.fn(),
    onStateChanged: vi.fn().mockReturnValue(() => {}),
    findAllSelected: vi.fn().mockReturnValue([1]),
    onSelectionChanged: vi.fn().mockReturnValue(() => {}),
    getType: vi.fn().mockReturnValue("graphic"),
    toggleBoldText: vi.fn(),
    toggleItalicText: vi.fn(),
    setTextAlign: vi.fn(),
  };
  const engine = { block };
  return engine as unknown as EditxEngine & { block: typeof block };
}

type BlockType = "text" | "graphic" | "image";

function renderBar(blockType: BlockType, engine: EditxEngine = makeEngine()) {
  return render(
    <I18nProvider>
      <ImageEditorProvider>
        <TooltipProvider>
          <BlockPropertiesBar engine={engine} blockId={7} blockType={blockType} />
        </TooltipProvider>
      </ImageEditorProvider>
    </I18nProvider>,
  );
}

describe("BlockPropertiesBar", () => {
  beforeEach(() => {
    useImageEditorStore.setState({
      propertySidePanel: null,
      textSelectionRange: null,
      editingTextBlockId: null,
    });
  });

  afterEach(cleanup);

  it("renders shared controls for a graphic block", () => {
    renderBar("graphic");
    // Shared controls present for every block type.
    expect(screen.getByRole("button", { name: "Shadow" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Opacity" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Position" })).toBeDefined();
    // Graphic-specific: color + stroke panels.
    expect(screen.getByRole("button", { name: "Color" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Stroke" })).toBeDefined();
  });

  it("renders image-specific controls for an image block", () => {
    renderBar("image");
    expect(screen.getByRole("button", { name: "Image" })).toBeDefined();
    // Style dropdown (Adjustments / Filters) exists for images only.
    expect(screen.getByRole("button", { name: "Style" })).toBeDefined();
    // No text-only color swatch for images.
    expect(screen.queryByRole("button", { name: "Color" })).toBeNull();
  });

  it("renders text-formatting controls for a text block", () => {
    renderBar("text");
    expect(screen.getByRole("button", { name: "Bold" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Italic" })).toBeDefined();
    expect(screen.getByRole("button", { name: "More text options" })).toBeDefined();
  });

  it("keeps the data-text-toolbar marker on the root container", () => {
    const { container } = renderBar("text");
    // The blur-handler in the text overlay relies on this attribute surviving
    // the file split — its absence would close the editor on every toolbar click.
    expect(container.querySelector("[data-text-toolbar]")).not.toBeNull();
  });

  it("toggles a side panel open and closed repeatedly", () => {
    renderBar("graphic");
    const shadow = screen.getByRole("button", { name: "Shadow" });

    fireEvent.click(shadow);
    expect(useImageEditorStore.getState().propertySidePanel).toBe("shadow");
    expect(screen.getByRole("button", { name: "Shadow" }).className).toContain("bg-primary");

    fireEvent.click(screen.getByRole("button", { name: "Shadow" }));
    expect(useImageEditorStore.getState().propertySidePanel).toBeNull();

    // Repeats cleanly — regression proxy for PanelButton being a stable component.
    fireEvent.click(screen.getByRole("button", { name: "Shadow" }));
    expect(useImageEditorStore.getState().propertySidePanel).toBe("shadow");
  });

  it("does not remount PanelButton across an unrelated parent re-render", () => {
    const engine = makeEngine();
    let bump: () => void = () => {};

    const Harness: React.FC = () => {
      const [, setN] = useState(0);
      bump = () => setN((n) => n + 1);
      return (
        <I18nProvider>
          <ImageEditorProvider>
            <TooltipProvider>
              <BlockPropertiesBar engine={engine} blockId={7} blockType="graphic" />
            </TooltipProvider>
          </ImageEditorProvider>
        </I18nProvider>
      );
    };

    render(<Harness />);
    const before = screen.getByRole("button", { name: "Shadow" });
    // Trigger an unrelated parent state change.
    fireEvent.click(before); // open panel (real state that should persist)
    bump();
    bump();
    const after = screen.getByRole("button", { name: "Shadow" });

    // Stable top-level component → same DOM node is reconciled, not torn down.
    expect(after).toBe(before);
    // And the panel it opened stays open across the re-renders.
    expect(useImageEditorStore.getState().propertySidePanel).toBe("shadow");
  });

  it("exposes accessible, clickable primitive buttons for text formatting", () => {
    const engine = makeEngine();
    renderBar("text", engine);

    const bold = screen.getByRole("button", { name: "Bold" });
    // aria-label forwarded through the IconButton primitive.
    expect(bold.getAttribute("aria-label")).toBe("Bold");
    fireEvent.click(bold);
    expect(engine.block.toggleBoldText).toHaveBeenCalledWith(7, 0, "Hello".length);

    const italic = screen.getByRole("button", { name: "Italic" });
    expect(italic.getAttribute("aria-label")).toBe("Italic");
    fireEvent.click(italic);
    expect(engine.block.toggleItalicText).toHaveBeenCalledWith(7, 0, "Hello".length);
  });

  it("routes the no-fill toggle through the engine for graphic blocks", () => {
    const engine = makeEngine();
    renderBar("graphic", engine);

    // Icon-only toggle labelled via aria-label ("Disable fill" when enabled).
    const noFill = screen.getByRole("button", { name: "Disable fill" });
    fireEvent.click(noFill);
    expect(engine.block.setFillEnabled).toHaveBeenCalledWith(7, false);
  });
});
