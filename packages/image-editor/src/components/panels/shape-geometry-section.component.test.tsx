import type { EditxEngine, ShapeGeometry } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShapeGeometrySection } from "./shape-geometry-section.component";

afterEach(cleanup);

function makeEngine(kind: string, values: Record<string, number> = {}) {
  const block = {
    getShape: vi.fn(() => 9),
    getKind: vi.fn((id: number) => (id === 9 ? kind : "graphic")),
    getFloat: vi.fn((_id: number, key: string) => values[key] ?? 0),
    setShapeGeometry: vi.fn((_id: number, _geometry: ShapeGeometry) => undefined),
  };
  const engine = {
    block,
    onHistoryChanged: vi.fn(() => () => undefined),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  } as unknown as EditxEngine;
  return { engine, block };
}

describe("ShapeGeometrySection", () => {
  it("shows only rectangle properties for rectangles", () => {
    const { engine } = makeEngine("rect", { "shape/rect/cornerRadius": 12 });
    render(<ShapeGeometrySection engine={engine} blockId={7} />);

    expect(screen.getByText("Corner Radius")).toBeDefined();
    expect(screen.queryByLabelText("Sides")).toBeNull();
    expect(screen.queryByLabelText("Points")).toBeNull();
  });

  it("shows polygon sides and writes geometry through the engine", () => {
    const { engine, block } = makeEngine("polygon", { "shape/polygon/sides": 5 });
    render(<ShapeGeometrySection engine={engine} blockId={7} />);

    fireEvent.change(screen.getByLabelText("Sides"), { target: { value: "8" } });
    expect(block.setShapeGeometry).toHaveBeenCalledWith(7, { type: "polygon", sides: 8 });
    expect(screen.queryByText("Corner Radius")).toBeNull();
  });

  it("renders no parameter section for ellipse and path geometry", () => {
    const ellipse = makeEngine("ellipse");
    const { unmount } = render(<ShapeGeometrySection engine={ellipse.engine} blockId={7} />);
    expect(screen.queryByText("Properties")).toBeNull();
    unmount();

    const path = makeEngine("path");
    render(<ShapeGeometrySection engine={path.engine} blockId={8} />);
    expect(screen.queryByText("Properties")).toBeNull();
  });
});
