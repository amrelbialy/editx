import {
  colorToHex,
  EditxEngine,
  SHAPE_LINE_POINTER_LENGTH,
  SHAPE_LINE_POINTER_WIDTH,
} from "@editx/engine";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resolveTextPreview } from "../../../config/presets/derive-text-preview";
import { combo } from "../../../config/presets/text-presets-combo-factory";
import { editorialCombos } from "../../../config/presets/text-presets-combos-editorial";
import { PresetThumbnail } from "./preset-thumbnail.component";

afterEach(cleanup);

describe("PresetThumbnail composition fitting", () => {
  it("retains and renders the Speech bubble path and tail", () => {
    const preset = editorialCombos.find(({ id }) => id === "quote");
    if (!preset) throw new Error("expected quote preset");
    const preview = resolveTextPreview(preset);
    if (preview.kind !== "composition") throw new Error("expected composition preview");
    const bubble = preview.layers[0];
    if (bubble.kind !== "shape" || bubble.shape.kind !== "path") {
      throw new Error("expected path preview layer");
    }

    expect(bubble.shape.pathData).toContain("L115 104V86");
    expect(bubble.shape.viewBox).toEqual({ width: 240, height: 108 });

    const { container } = render(<PresetThumbnail preview={preview} />);
    const svg = container.querySelector("svg[data-composition-shape='path']");
    const paths = svg?.querySelectorAll("path");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 240 108");
    expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMinYMin meet");
    expect(paths?.[0].getAttribute("d")).toBe(bubble.shape.pathData);
    expect(svg?.querySelector("path[stroke]")?.getAttribute("stroke")).toBe("#0f172a");
  });

  it("renders rectangle radius at the same proportion used by insertion", () => {
    const preset = editorialCombos.find(({ id }) => id === "name-role");
    if (!preset) throw new Error("expected Studio Signature preset");
    const preview = resolveTextPreview(preset);
    if (preview.kind !== "composition") throw new Error("expected composition preview");

    const shapeLayers = preview.layers.filter((layer) => layer.kind === "shape");
    const authoredShapes = preset.composition?.elements.filter(
      (element) => element.kind === "shape",
    );
    expect(shapeLayers[0].style?.borderRadius).toBe(
      `${((authoredShapes?.[0].shape.cornerRadius ?? 0) / (preview.bounds.height * 1080)) * 100}cqh`,
    );
    expect(shapeLayers[1].style?.border).toBe(
      `${((authoredShapes?.[1].stroke?.width ?? 0) / (preview.bounds.height * 1080)) * 100}cqh solid #b45309`,
    );

    const { container } = render(<PresetThumbnail preview={preview} />);
    const cards = container.querySelectorAll<HTMLElement>("[data-composition-shape='rect']");
    expect(cards).toHaveLength(2);
  });

  it.each([
    ["rect", { kind: "rect" as const }],
    ["ellipse", { kind: "ellipse" as const }],
    ["polygon", { kind: "polygon" as const, sides: 6 }],
    ["star", { kind: "star" as const, points: 7, innerDiameter: 0.4 }],
    ["line", { kind: "line" as const }],
  ])("renders faithful %s composition geometry", (name, shape) => {
    const { container } = render(
      <PresetThumbnail
        preview={{
          kind: "composition",
          bounds: { x: 0, y: 0, width: 1, height: 1 },
          layers: [
            {
              kind: "shape",
              layout: { x: 0, y: 0, width: 1, height: 1 },
              shape,
              style: { background: "#dc2626", border: "2px solid #ffffff" },
            },
          ],
        }}
      />,
    );
    const element = container.querySelector<HTMLElement>(`[data-composition-shape='${name}']`);
    expect(element).not.toBeNull();
    if (name === "rect" || name === "ellipse") {
      expect(element?.style.background).toBe("#dc2626");
      expect(element?.style.border).toBe("2px solid #ffffff");
      return;
    }
    expect(element?.tagName).toBe("svg");
    const geometry = element?.querySelector("svg > polygon[stroke], svg > line[stroke]");
    expect(element?.querySelector("svg > polygon, svg > path")?.getAttribute("fill")).toBe(
      "#dc2626",
    );
    expect(geometry?.getAttribute("stroke")).toBe("#ffffff");
    expect(geometry?.getAttribute("stroke-width")).toBe("2");
    expect(element?.querySelector("foreignObject")).toBeNull();
    if (name === "polygon")
      expect(
        element?.querySelector("clipPath polygon")?.getAttribute("points")?.split(" "),
      ).toHaveLength(6);
    if (name === "star")
      expect(
        element?.querySelector("clipPath polygon")?.getAttribute("points")?.split(" "),
      ).toHaveLength(14);
    if (name === "line") expect(element?.querySelector("svg > line")).not.toBeNull();
  });

  it("matches inserted line defaults when the composition authors no stroke", () => {
    const engine = new EditxEngine({ renderer: undefined });
    const pageId = engine.block.create("page");
    const lineId = engine.block.addShape(pageId, "line", "color", 0, 0, 100, 100);
    const shapeId = engine.block.getShape(lineId);
    if (shapeId == null) throw new Error("expected line shape block");

    const expectedStroke = colorToHex(engine.block.getStrokeColor(lineId));
    const expectedWidth = engine.block.getStrokeWidth(lineId);
    const pointerLength = engine.block.getFloat(shapeId, SHAPE_LINE_POINTER_LENGTH);
    const pointerWidth = engine.block.getFloat(shapeId, SHAPE_LINE_POINTER_WIDTH);
    expect({ expectedStroke, expectedWidth, pointerLength, pointerWidth }).toEqual({
      expectedStroke: "#4a8fe3",
      expectedWidth: 10,
      pointerLength: 15,
      pointerWidth: 15,
    });

    const { container } = render(
      <PresetThumbnail
        preview={{
          kind: "composition",
          bounds: { x: 0, y: 0, width: 1, height: 1 },
          layers: [
            {
              kind: "shape",
              layout: { x: 0, y: 0, width: 1, height: 1 },
              shape: { kind: "line" },
              style: { background: "#dc2626" },
            },
          ],
        }}
      />,
    );
    const svg = container.querySelector("svg[data-composition-shape='line']");
    const shaft = svg?.querySelector("svg > line");
    const pointer = svg?.querySelector("svg > polygon[stroke]");
    expect(shaft?.getAttribute("stroke")).toBe(expectedStroke);
    expect(shaft?.getAttribute("stroke-width")).toBe(String(expectedWidth));
    expect(pointer?.getAttribute("points")).toBe(
      `${100 - pointerLength},${50 + pointerWidth / 2} 100,50 ${100 - pointerLength},${50 - pointerWidth / 2}`,
    );
    expect(pointer?.getAttribute("fill")).toBe("none");
    expect(svg?.querySelector("svg > polygon[fill='#dc2626']")).not.toBeNull();
  });

  it("uses an authored line stroke instead of the insertion defaults", () => {
    const { container } = render(
      <PresetThumbnail
        preview={{
          kind: "composition",
          bounds: { x: 0, y: 0, width: 1, height: 1 },
          layers: [
            {
              kind: "shape",
              layout: { x: 0, y: 0, width: 1, height: 1 },
              shape: { kind: "line" },
              style: { background: "#dc2626", border: "3px solid #ffffff" },
            },
          ],
        }}
      />,
    );
    const svg = container.querySelector("svg[data-composition-shape='line']");
    expect(svg?.querySelector("svg > line")?.getAttribute("stroke")).toBe("#ffffff");
    expect(svg?.querySelector("svg > line")?.getAttribute("stroke-width")).toBe("3");
    expect(svg?.querySelector("svg > polygon[stroke]")?.getAttribute("stroke")).toBe("#ffffff");
  });

  it("fits the thank-you heading on one finite line in a narrow preset card", () => {
    const preset = editorialCombos.find(({ id }) => id === "heading-subtitle");
    if (!preset) throw new Error("expected heading-subtitle preset");
    const preview = resolveTextPreview(preset);
    if (preview.kind !== "composition") throw new Error("expected composition preview");

    const { container } = render(<PresetThumbnail preview={preview} />);
    const heading = [...container.querySelectorAll<HTMLElement>("[data-composition-line]")].find(
      ({ textContent }) => textContent === "Thank You",
    );
    const layer = heading?.closest<HTMLElement>("[data-composition-layer='text']");
    const sizing = heading?.closest<HTMLElement>("[data-font-size-scale]");

    expect(heading?.className).toContain("whitespace-nowrap");
    expect(layer).not.toBeNull();
    expect(sizing?.dataset.fontSizeScale).toBe("2.25");
  });

  it("pads bounds and preserves multiline text without truncation", () => {
    const preview = resolveTextPreview(
      combo({
        id: "multiline",
        label: "Multiline",
        width: 0.35,
        lines: [{ text: "One\nTwo", scale: 2, widthMode: "fixed" }],
      }),
    );
    if (preview.kind !== "composition") throw new Error("expected composition preview");

    const { container } = render(<PresetThumbnail preview={preview} />);
    expect(preview.bounds.width).toBeGreaterThan(0.35);
    expect(container.querySelectorAll("[data-composition-line]")).toHaveLength(2);
    expect(container.querySelector("[data-composition-line]")?.className).not.toContain("truncate");
  });

  it("renders block background boxes inside composition text layers", () => {
    const preview = resolveTextPreview(
      combo({
        id: "boxed-composition",
        label: "Boxed composition",
        lines: [
          {
            text: "Inside",
            scale: 2,
            backgroundBox: {
              color: "#c7d2fe",
              padding: 12,
              cornerRadius: 6,
              stroke: { color: "#172554", width: 2 },
            },
          },
        ],
      }),
    );
    if (preview.kind !== "composition") throw new Error("expected composition preview");

    const { container } = render(<PresetThumbnail preview={preview} />);
    const box = container.querySelector<HTMLElement>("[data-preview-box]");
    expect(box?.style.background).toBe("#c7d2fe");
    expect(box?.style.padding).not.toBe("");
    expect(box?.style.border).toContain("solid #172554");
  });

  it("keeps a narrow kicker visible and scales a large headline independently", () => {
    const preview = resolveTextPreview(
      combo({
        id: "hierarchy",
        label: "Hierarchy",
        width: 0.4,
        lines: [
          { text: "NARROW KICKER", scale: 0.8, letterSpacing: 6 },
          { text: "BIG", scale: 4, gap: 0.2 },
        ],
      }),
    );
    if (preview.kind !== "composition") throw new Error("expected composition preview");

    const { container } = render(<PresetThumbnail preview={preview} />);
    const layers = container.querySelectorAll<HTMLElement>("[data-font-size-scale]");
    expect(layers).toHaveLength(2);
    expect(layers[0].dataset.fontSizeScale).toBe("0.8");
    expect(layers[1].dataset.fontSizeScale).toBe("4");
    expect(layers[0].parentElement?.className).not.toContain("overflow-hidden");
  });

  it("produces finite layer percentages and keeps authored z-order", () => {
    const preview = resolveTextPreview(
      combo({
        id: "layered",
        label: "Layered",
        shapes: [
          {
            kind: "shape",
            layout: { x: 0.2, y: 0.4, width: 0.6, height: 0.2 },
            shape: { kind: "rect" },
            fill: { kind: "color", color: "#000000" },
          },
        ],
        lines: [{ text: "Headline", scale: 3 }],
      }),
    );
    if (preview.kind !== "composition") throw new Error("expected composition preview");

    const { container } = render(<PresetThumbnail preview={preview} />);
    const layers = [...container.querySelectorAll<HTMLElement>("[data-composition-layer]")];
    expect(layers.map((layer) => layer.dataset.compositionLayer)).toEqual(["shape", "text"]);
    for (const layer of layers) {
      expect(
        `${layer.style.left}${layer.style.top}${layer.style.width}${layer.style.height}`,
      ).not.toContain("NaN");
      expect(
        `${layer.style.left}${layer.style.top}${layer.style.width}${layer.style.height}`,
      ).not.toContain("Infinity");
    }
  });
});
