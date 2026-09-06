import type { EditxEngine } from "@editx/engine";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShapeGeometrySection } from "./shape-geometry-section.component";

vi.mock("../ui/slider-field", () => ({
  SliderField: (props: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    onCommit?: (value: number) => void;
  }) => (
    <input
      aria-label={props.label}
      type="range"
      value={props.value}
      onChange={(event) => props.onChange(Number(event.target.value))}
      onBlur={() => props.onCommit?.(props.value)}
    />
  ),
}));

function makeEngine(kind: "polygon" | "star" | "rect") {
  const block = {
    getShape: vi.fn().mockReturnValue(9),
    getKind: vi.fn((id: number) => (id === 9 ? kind : "graphic")),
    getFloat: vi.fn((_id: number, key: string) => {
      if (key === "shape/star/points") return 5;
      if (key === "shape/star/innerDiameter") return 0.5;
      return 6;
    }),
    setShapeGeometry: vi.fn(),
  };
  const engine = {
    block,
    onHistoryChanged: vi.fn().mockReturnValue(() => {}),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  };
  return engine as unknown as EditxEngine & {
    block: typeof block;
    beginBatch: ReturnType<typeof vi.fn>;
    endBatch: ReturnType<typeof vi.fn>;
  };
}

describe("ShapeGeometrySection", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("clamps polygon sides before calling the engine", () => {
    const engine = makeEngine("polygon");
    render(<ShapeGeometrySection engine={engine} blockId={7} />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Sides" }), {
      target: { value: "1" },
    });
    expect(engine.block.setShapeGeometry).toHaveBeenLastCalledWith(7, {
      type: "polygon",
      sides: 3,
    });
  });

  it("clamps star values before calling the engine", () => {
    const engine = makeEngine("star");
    render(<ShapeGeometrySection engine={engine} blockId={7} />);

    fireEvent.change(screen.getByRole("slider", { name: "Inner Diameter" }), {
      target: { value: "1.5" },
    });
    expect(engine.block.setShapeGeometry).toHaveBeenLastCalledWith(7, {
      type: "star",
      points: 5,
      innerDiameter: 1,
    });
  });

  it("coalesces rapid changes and flushes after the idle window", () => {
    const engine = makeEngine("polygon");
    render(<ShapeGeometrySection engine={engine} blockId={7} />);
    const input = screen.getByRole("spinbutton", { name: "Sides" });

    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.change(input, { target: { value: "9" } });

    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(350));
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
  });

  it("flushes immediately when a numeric input blurs", () => {
    const engine = makeEngine("polygon");
    render(<ShapeGeometrySection engine={engine} blockId={7} />);
    const input = screen.getByRole("spinbutton", { name: "Sides" });

    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.blur(input);
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
  });
});
