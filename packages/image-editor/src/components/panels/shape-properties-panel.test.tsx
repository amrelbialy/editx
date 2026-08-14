import type { EditxEngine, ShapeGeometry } from "@editx/engine";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageEditorConfig } from "../../config/config.types";
import { ImageEditorProvider } from "../../config/config-context";
import { I18nProvider } from "../../i18n/i18n-context";
import { TooltipProvider } from "../ui";
import { ShapePropertiesPanel } from "./shape-properties-panel";

// SliderField wraps a base-ui Slider whose pointer geometry isn't simulated in
// jsdom; a plain input lets tests drive onChange/onCommit like a real slider.
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

function makeEngine(initialKind: string, initialName = "") {
  let kind = initialKind;
  let name = initialName;
  let historyChanged = () => {};
  const values: Record<string, number> = {
    "shape/rect/cornerRadius": 8,
    "shape/polygon/sides": 6,
    "shape/star/points": 5,
    "shape/star/innerDiameter": 0.5,
    "shape/line/pointerLength": 15,
    "shape/line/pointerWidth": 15,
  };
  const block = {
    getShape: vi.fn(() => 9),
    getKind: vi.fn((id: number) => (id === 9 ? kind : "graphic")),
    getName: vi.fn(() => name),
    getFloat: vi.fn((_id: number, key: string) => values[key] ?? 0),
    setShapeGeometry: vi.fn((_id: number, geometry: ShapeGeometry) => {
      kind = geometry.type;
      name = geometry.type === "path" ? (geometry.name ?? "") : "";
    }),
    setFloat: vi.fn(),
    setFill: vi.fn(),
    setOpacity: vi.fn(),
  };
  const engine = {
    block,
    onHistoryChanged: vi.fn((callback: () => void) => {
      historyChanged = callback;
      return () => {};
    }),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  } as unknown as EditxEngine & {
    block: typeof block;
    beginBatch: ReturnType<typeof vi.fn>;
    endBatch: ReturnType<typeof vi.fn>;
    renderDirty: ReturnType<typeof vi.fn>;
  };
  return {
    engine,
    block,
    setKind(next: string, nextName = "") {
      kind = next;
      name = nextName;
    },
    notifyHistory() {
      historyChanged();
    },
  };
}

function renderPanel(engine: EditxEngine, config?: ImageEditorConfig) {
  return render(
    <I18nProvider>
      <ImageEditorProvider config={config}>
        <TooltipProvider>
          <ShapePropertiesPanel engine={engine} blockId={7} />
        </TooltipProvider>
      </ImageEditorProvider>
    </I18nProvider>,
  );
}

describe("ShapePropertiesPanel", () => {
  afterEach(cleanup);

  it("shows a configured named path and applies only geometry when selecting a primitive", () => {
    const { engine, block } = makeEngine("path", "custom-kite");
    renderPanel(engine, {
      shapes: {
        presetGroups: [
          {
            id: "custom",
            label: "Custom",
            presets: [
              {
                id: "custom-kite",
                label: "Kite",
                shape: {
                  kind: "path",
                  pathData: "M50 0 L100 50 L50 100 L0 50 Z",
                  viewBox: { width: 100, height: 100 },
                },
                fill: { kind: "color", color: "#123456" },
                preview: { kind: "shape" },
              },
            ],
          },
        ],
      },
    });

    const select = screen.getByRole("combobox", { name: "Geometry" });
    expect(select.textContent).toContain("Kite");

    fireEvent.keyDown(select, { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "Ellipse" }));
    expect(block.setShapeGeometry).toHaveBeenCalledWith(7, { type: "ellipse" });
    expect(block.setFloat).not.toHaveBeenCalled();
    expect(block.setFill).not.toHaveBeenCalled();
    expect(block.setOpacity).not.toHaveBeenCalled();
  });

  it("shows conditional controls, routes values, and refreshes after history", () => {
    const state = makeEngine("polygon");
    renderPanel(state.engine);

    expect(screen.getByRole("spinbutton", { name: "Sides" })).toBeDefined();
    expect(screen.queryByText("Corner Radius")).toBeNull();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Sides" }), {
      target: { value: "7" },
    });
    expect(state.block.setShapeGeometry).toHaveBeenLastCalledWith(7, {
      type: "polygon",
      sides: 7,
    });

    state.setKind("rect");
    act(() => state.notifyHistory());
    expect(screen.getByRole("slider", { name: "Corner Radius" })).toBeDefined();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("routes star and line type-specific controls with their companion values", () => {
    const state = makeEngine("star");
    const view = renderPanel(state.engine);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Points" }), {
      target: { value: "9" },
    });
    expect(state.block.setShapeGeometry).toHaveBeenLastCalledWith(7, {
      type: "star",
      points: 9,
      innerDiameter: 0.5,
    });
    state.setKind("line");
    act(() => state.notifyHistory());
    const pointerLength = screen.getByRole("spinbutton", { name: "Pointer Length" });
    const pointerWidth = screen.getByRole("spinbutton", { name: "Pointer Width" });
    fireEvent.change(pointerLength, { target: { value: "22" } });
    expect(state.block.setShapeGeometry).toHaveBeenLastCalledWith(7, {
      type: "line",
      pointerLength: 22,
      pointerWidth: 15,
    });
    fireEvent.change(pointerWidth, { target: { value: "18" } });
    expect(state.block.setShapeGeometry).toHaveBeenLastCalledWith(7, {
      type: "line",
      pointerLength: 15,
      pointerWidth: 18,
    });

    expect(state.block.setFloat).not.toHaveBeenCalled();
    view.unmount();
  });

  it("has a matching accessible name for every numeric control", () => {
    const state = makeEngine("star");
    renderPanel(state.engine);
    expect(screen.getByRole("spinbutton", { name: "Points" })).toBeDefined();
    expect(screen.getByRole("slider", { name: "Inner Diameter" })).toBeDefined();

    state.setKind("rect");
    act(() => state.notifyHistory());
    expect(screen.getByRole("slider", { name: "Corner Radius" })).toBeDefined();

    state.setKind("polygon");
    act(() => state.notifyHistory());
    expect(screen.getByRole("spinbutton", { name: "Sides" })).toBeDefined();

    state.setKind("line");
    act(() => state.notifyHistory());
    expect(screen.getByRole("spinbutton", { name: "Pointer Length" })).toBeDefined();
    expect(screen.getByRole("spinbutton", { name: "Pointer Width" })).toBeDefined();
  });

  describe("out-of-range values", () => {
    it("never lets sides below 3 reach setShapeGeometry", () => {
      const state = makeEngine("polygon");
      renderPanel(state.engine);
      expect(() =>
        fireEvent.change(screen.getByRole("spinbutton", { name: "Sides" }), {
          target: { value: "1" },
        }),
      ).not.toThrow();
      expect(state.block.setShapeGeometry).toHaveBeenLastCalledWith(7, {
        type: "polygon",
        sides: 3,
      });
    });

    it("never lets points below 2 reach setShapeGeometry", () => {
      const state = makeEngine("star");
      renderPanel(state.engine);
      expect(() =>
        fireEvent.change(screen.getByRole("spinbutton", { name: "Points" }), {
          target: { value: "1" },
        }),
      ).not.toThrow();
      expect(state.block.setShapeGeometry).toHaveBeenLastCalledWith(7, {
        type: "star",
        points: 2,
        innerDiameter: 0.5,
      });
    });

    it("clamps innerDiameter outside [0, 1] instead of throwing", () => {
      const state = makeEngine("star");
      renderPanel(state.engine);
      const slider = screen.getByRole("slider", { name: "Inner Diameter" });

      expect(() => fireEvent.change(slider, { target: { value: "1.5" } })).not.toThrow();
      expect(state.block.setShapeGeometry).toHaveBeenLastCalledWith(7, {
        type: "star",
        points: 5,
        innerDiameter: 1,
      });

      expect(() => fireEvent.change(slider, { target: { value: "-0.2" } })).not.toThrow();
      expect(state.block.setShapeGeometry).toHaveBeenLastCalledWith(7, {
        type: "star",
        points: 5,
        innerDiameter: 0,
      });
    });

    it("ignores non-numeric intermediate input without calling setShapeGeometry", () => {
      const state = makeEngine("polygon");
      renderPanel(state.engine);
      fireEvent.change(screen.getByRole("spinbutton", { name: "Sides" }), {
        target: { value: "-" },
      });
      expect(state.block.setShapeGeometry).not.toHaveBeenCalled();
    });
  });

  describe("coalescing", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("collapses a rapid burst of parameter changes into a single history batch", () => {
      const state = makeEngine("polygon");
      renderPanel(state.engine);
      const input = screen.getByRole("spinbutton", { name: "Sides" });

      fireEvent.change(input, { target: { value: "4" } });
      fireEvent.change(input, { target: { value: "5" } });
      fireEvent.change(input, { target: { value: "9" } });

      expect(state.block.setShapeGeometry).toHaveBeenCalledTimes(3);
      expect(state.engine.beginBatch).toHaveBeenCalledTimes(1);
      expect(state.engine.endBatch).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(350));
      expect(state.engine.endBatch).toHaveBeenCalledTimes(1);
    });

    it("flushes immediately on input blur instead of waiting for the idle window", () => {
      const state = makeEngine("polygon");
      renderPanel(state.engine);
      const input = screen.getByRole("spinbutton", { name: "Sides" });

      fireEvent.change(input, { target: { value: "4" } });
      expect(state.engine.endBatch).not.toHaveBeenCalled();

      fireEvent.blur(input);
      expect(state.engine.endBatch).toHaveBeenCalledTimes(1);
    });

    it("flushes immediately on slider commit instead of waiting for the idle window", () => {
      const state = makeEngine("rect");
      renderPanel(state.engine);
      const slider = screen.getByRole("slider", { name: "Corner Radius" });

      fireEvent.change(slider, { target: { value: "40" } });
      expect(state.engine.endBatch).not.toHaveBeenCalled();

      fireEvent.blur(slider);
      expect(state.engine.endBatch).toHaveBeenCalledTimes(1);
    });
  });
});
