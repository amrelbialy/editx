import type { EditxEngine, ShapeGeometry } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { I18nProvider } from "../../i18n/i18n-context";
import { ShapeReplacePanel } from "./shape-replace-panel.component";

afterEach(cleanup);

it("replaces geometry without changing appearance", () => {
  const block = {
    getShape: vi.fn(() => 9),
    getFill: vi.fn(() => 10),
    getKind: vi.fn((id: number) => (id === 9 ? "ellipse" : id === 10 ? "color" : "graphic")),
    isFillEnabled: vi.fn(() => true),
    getFillSolidColor: vi.fn(() => ({ r: 0, g: 0, b: 0, a: 0 })),
    getFillGradient: vi.fn(() => null),
    getFillImage: vi.fn(() => null),
    isStrokeEnabled: vi.fn(() => true),
    getStrokeColor: vi.fn(() => ({ r: 1, g: 0, b: 0, a: 1 })),
    getStrokeWidth: vi.fn(() => 6),
    getFloat: vi.fn(() => 0),
    setShapeGeometry: vi.fn((_id: number, _geometry: ShapeGeometry) => undefined),
    setFillSolidColor: vi.fn(),
    setStrokeColor: vi.fn(),
    setStrokeWidth: vi.fn(),
  };
  const engine = {
    block,
    onHistoryChanged: vi.fn(() => () => undefined),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  } as unknown as EditxEngine;

  render(
    <I18nProvider>
      <ImageEditorProvider>
        <ShapeReplacePanel engine={engine} blockId={7} />
      </ImageEditorProvider>
    </I18nProvider>,
  );
  const rectangle = screen.getByRole("button", { name: "Rectangle" });
  expect(rectangle.querySelector('rect[fill="none"]')).not.toBeNull();
  expect(rectangle.querySelector('rect[stroke="#ff0000"]')).not.toBeNull();
  fireEvent.click(rectangle);

  expect(block.setShapeGeometry).toHaveBeenCalledWith(7, {
    type: "rect",
    cornerRadius: undefined,
  });
  expect(block.setFillSolidColor).not.toHaveBeenCalled();
  expect(block.setStrokeColor).not.toHaveBeenCalled();
  expect(block.setStrokeWidth).not.toHaveBeenCalled();
  expect(screen.queryByText("Properties")).toBeNull();
  expect(screen.queryByText("Corner Radius")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Arrow" }));
  expect(block.setShapeGeometry).toHaveBeenCalledWith(7, {
    type: "line",
    pointerLength: undefined,
    pointerWidth: undefined,
  });
});
