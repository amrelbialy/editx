import type { EditxEngine } from "@editx/engine";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { I18nProvider } from "../../i18n/i18n-context";
import { ShapeFillPanel } from "./shape-fill-panel";

vi.mock("../../utils/process-image-file", () => ({
  processImageFile: vi.fn().mockResolvedValue({
    src: "data:image/png;base64,processed",
    width: 640,
    height: 480,
  }),
}));

vi.mock("../ui/slider", () => ({
  Slider: (props: { value: number[]; onValueChange: (value: number[]) => void }) => (
    <input
      type="range"
      value={props.value[0]}
      onChange={(event) => props.onValueChange([Number(event.target.value)])}
    />
  ),
}));

function makeEngine(kind: "color" | "gradient" | "image" = "color") {
  let activeKind = kind;
  let historyChanged = () => {};
  const block = {
    getFill: vi.fn().mockReturnValue(10),
    getKind: vi.fn(() => activeKind),
    getColor: vi.fn().mockReturnValue({ r: 0.2, g: 0.4, b: 0.6, a: 1 }),
    getFillGradient: vi.fn(() =>
      activeKind === "gradient"
        ? {
            type: "radial",
            angle: 45,
            stops: [
              { offset: 0, color: "#123456" },
              { offset: 1, color: "#abcdef" },
            ],
          }
        : null,
    ),
    getFillImage: vi.fn(() =>
      activeKind === "image"
        ? { src: "", fit: "contain", offsetX: 12, offsetY: 18, scale: 1.5 }
        : null,
    ),
    isFillEnabled: vi.fn().mockReturnValue(true),
    getOpacity: vi.fn().mockReturnValue(0.75),
    setFillEnabled: vi.fn(),
    setFillSolidColor: vi.fn(),
    setFillGradient: vi.fn(),
    setFillImage: vi.fn(),
    setOpacity: vi.fn(),
    changeFillKind: vi.fn((_blockId: number, nextKind: "color" | "gradient" | "image") => {
      activeKind = nextKind;
    }),
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
    fireHistory: () => historyChanged(),
  };
  return engine as unknown as EditxEngine & {
    block: typeof block;
    fireHistory: () => void;
  };
}

function renderPanel(engine: EditxEngine, enabled?: boolean) {
  return render(
    <I18nProvider>
      <ImageEditorProvider config={{ colors: ["#123456", "#abcdef"] }}>
        <ShapeFillPanel engine={engine} blockId={7} enabled={enabled} />
      </ImageEditorProvider>
    </I18nProvider>,
  );
}

describe("ShapeFillPanel", () => {
  afterEach(cleanup);

  it("shows the complete color picker UI in Color mode", () => {
    const engine = makeEngine();
    const { container } = renderPanel(engine);

    expect(container.querySelector('input[type="color"]')).not.toBeNull();
    expect(screen.getByText("Hex")).toBeDefined();
    expect(screen.getByText("Default Colors")).toBeDefined();
    expect(screen.getByRole("slider")).toBeDefined();
    expect(container.querySelectorAll('button[style*="background-color"]')).toHaveLength(2);
  });

  it("routes solid color and opacity changes through engine commands", () => {
    const engine = makeEngine();
    const { container } = renderPanel(engine);
    const colorInput = container.querySelector('input[type="color"]') as HTMLInputElement;

    fireEvent.change(colorInput, { target: { value: "#123456" } });
    expect(engine.block.setFillSolidColor).toHaveBeenCalledWith(7, expect.any(Object));

    fireEvent.change(screen.getByRole("slider"), { target: { value: "0.5" } });
    expect(engine.block.setOpacity).toHaveBeenCalledWith(7, 0.5);
  });

  it("keeps disabled fill controls mounted, muted, and usable", () => {
    const engine = makeEngine();
    const { container } = renderPanel(engine, false);

    expect(screen.queryByRole("switch", { name: "Enable fill" })).toBeNull();
    expect(screen.getByRole("tablist", { name: "Fill" })).toBeDefined();
    expect(container.firstElementChild?.classList.contains("opacity-50")).toBe(true);

    fireEvent.click(screen.getByRole("tab", { name: "Gradient" }));
    expect(engine.block.changeFillKind).toHaveBeenCalledWith(7, "gradient");
  });

  it("matches text gradient controls and applies gradient type changes", () => {
    const engine = makeEngine("gradient");
    renderPanel(engine);

    expect(screen.getByRole("tab", { name: "Radial" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("spinbutton", { name: "Angle" })).toBeNull();
    expect(screen.getByText("Opacity")).toBeDefined();
    expect(screen.getByRole("slider")).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: "Linear" }));

    expect(engine.block.setFillGradient).toHaveBeenLastCalledWith(7, {
      type: "linear",
      angle: 45,
      stops: [
        { offset: 0, color: "#123456" },
        { offset: 1, color: "#abcdef" },
      ],
    });
    expect(engine.block.setFillGradient).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Angle")).toBeDefined();
    expect(screen.getByRole("spinbutton")).toBeDefined();
  });

  it("uploads a processed image without losing image-fill settings", async () => {
    const engine = makeEngine("image");
    const { container } = renderPanel(engine);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(["image"], "fill.png", { type: "image/png" })] },
    });

    await waitFor(() =>
      expect(engine.block.setFillImage).toHaveBeenCalledWith(7, {
        src: "data:image/png;base64,processed",
        fit: "contain",
        offsetX: 12,
        offsetY: 18,
        scale: 1.5,
      }),
    );
  });

  it("keeps the current fill until the first image is selected", async () => {
    const engine = makeEngine("color");
    const { container } = renderPanel(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Image" }));

    expect(engine.block.changeFillKind).not.toHaveBeenCalled();
    expect(engine.block.setFillImage).not.toHaveBeenCalled();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["image"], "fill.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(engine.beginBatch).toHaveBeenCalledOnce();
      expect(engine.block.changeFillKind).toHaveBeenCalledWith(7, "image");
      expect(engine.block.setFillImage).toHaveBeenCalledWith(7, {
        src: "data:image/png;base64,processed",
        fit: "cover",
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      });
      expect(engine.endBatch).toHaveBeenCalledOnce();
    });
  });

  it("preserves gradient settings while another fill tab is active", () => {
    const engine = makeEngine("gradient");
    renderPanel(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Color" }));
    fireEvent.click(screen.getByRole("tab", { name: "Gradient" }));

    expect(engine.block.changeFillKind).toHaveBeenNthCalledWith(1, 7, "color");
    expect(engine.block.changeFillKind).toHaveBeenNthCalledWith(2, 7, "gradient");
    expect(engine.block.setFillGradient).toHaveBeenLastCalledWith(7, {
      type: "radial",
      angle: 45,
      stops: [
        { offset: 0, color: "#123456" },
        { offset: 1, color: "#abcdef" },
      ],
    });
    expect(screen.getByRole("tab", { name: "Radial" }).getAttribute("aria-selected")).toBe("true");
  });

  it("preserves the solid color while another fill tab is active", () => {
    const engine = makeEngine("color");
    const { container } = renderPanel(engine);
    const colorInput = container.querySelector('input[type="color"]') as HTMLInputElement;

    fireEvent.change(colorInput, { target: { value: "#123456" } });
    fireEvent.click(screen.getByRole("tab", { name: "Gradient" }));
    fireEvent.click(screen.getByRole("tab", { name: "Color" }));

    expect((container.querySelector('input[type="color"]') as HTMLInputElement).value).toBe(
      "#123456",
    );
  });

  it("keeps inactive gradient settings during a history refresh", () => {
    const engine = makeEngine("gradient");
    renderPanel(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Color" }));
    act(() => engine.fireHistory());
    fireEvent.click(screen.getByRole("tab", { name: "Gradient" }));

    expect(engine.block.setFillGradient).toHaveBeenLastCalledWith(7, {
      type: "radial",
      angle: 45,
      stops: [
        { offset: 0, color: "#123456" },
        { offset: 1, color: "#abcdef" },
      ],
    });
  });

  it("preserves image settings while another fill tab is active", () => {
    const engine = makeEngine("image");
    renderPanel(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Color" }));
    fireEvent.click(screen.getByRole("tab", { name: "Image" }));

    expect(engine.block.setFillImage).not.toHaveBeenCalled();
  });
});
