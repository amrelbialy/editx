import type { EditxEngine, ImageFill } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../../config/config-context";
import { I18nProvider } from "../../../i18n/i18n-context";
import { useImageEditorStore } from "../../../store/image-editor-store";
import { TooltipProvider } from "../../ui";
import { BlockPropertiesBar } from "./block-properties-bar.component";

function makeEngine(imageFill: ImageFill | null) {
  const block = {
    getOpacity: vi.fn(() => 1),
    getFill: vi.fn(() => null),
    getFillImage: vi.fn(() => imageFill),
    getColor: vi.fn(() => null),
    getType: vi.fn(() => "graphic"),
    getShape: vi.fn(() => 9),
    getKind: vi.fn((id: number) => (id === 9 ? "rect" : "graphic")),
    getFloat: vi.fn(() => 0),
    findAllSelected: vi.fn(() => [7]),
    onStateChanged: vi.fn(() => () => {}),
    onSelectionChanged: vi.fn(() => () => {}),
  };
  return {
    block,
    onHistoryChanged: vi.fn(() => () => {}),
  } as unknown as EditxEngine;
}

function renderGraphic(imageFill: ImageFill | null) {
  return render(
    <I18nProvider>
      <ImageEditorProvider>
        <TooltipProvider>
          <BlockPropertiesBar engine={makeEngine(imageFill)} blockId={7} blockType="graphic" />
        </TooltipProvider>
      </ImageEditorProvider>
    </I18nProvider>,
  );
}

const imageFill: ImageFill = {
  src: "fill.png",
  mode: "fit",
  offsetX: 0.2,
  offsetY: -0.1,
  scale: 1.4,
};

describe("BlockPropertiesBar graphic image fill", () => {
  beforeEach(() => {
    useImageEditorStore.setState({
      propertySidePanel: null,
      textSelectionRange: null,
      editingTextBlockId: null,
    });
  });

  afterEach(cleanup);

  it("keeps image actions hidden for a color or gradient graphic", () => {
    renderGraphic(null);

    expect(screen.getByRole("button", { name: "Fill" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Style" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Replace Image" })).toBeNull();
  });

  it("shows Style while keeping Fill for an image graphic", () => {
    renderGraphic(imageFill);

    expect(screen.getByRole("button", { name: "Fill" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Style" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Replace Image" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Image" })).toBeNull();
  });

  it.each([
    ["Adjustments", "adjust"],
    ["Filters", "filter"],
  ] as const)("opens %s panel state from Style", (label, panel) => {
    renderGraphic(imageFill);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Style" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(useImageEditorStore.getState().propertySidePanel).toBe(panel);
  });
});
