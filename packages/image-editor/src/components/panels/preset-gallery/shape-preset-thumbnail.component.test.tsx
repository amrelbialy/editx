import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ShapePreset } from "../../../config/config.types";
import { ShapePresetThumbnail } from "./shape-preset-thumbnail.component";

afterEach(cleanup);

const preview = { kind: "shape" as const };

function renderPreset(preset: ShapePreset) {
  return render(<ShapePresetThumbnail preset={preset} />).container;
}

describe("ShapePresetThumbnail", () => {
  it.each([
    ["rect", { kind: "rect" as const, cornerRadius: 9 }],
    ["ellipse", { kind: "ellipse" as const }],
    ["polygon", { kind: "polygon" as const, sides: 6 }],
    ["star", { kind: "star" as const, points: 7, innerDiameter: 0.35 }],
    ["line", { kind: "line" as const }],
  ])("renders semantic %s geometry", (kind, shape) => {
    const container = renderPreset({
      id: kind,
      label: kind,
      shape,
      fill: { kind: "color", color: "#16a34a" },
      preview,
    });
    const svg = container.querySelector(`svg[data-composition-shape='${kind}']`);

    expect(svg?.getAttribute("viewBox")).toBe("0 0 270 270");
    expect(svg?.querySelector("[fill='#16a34a']")).not.toBeNull();
    if (kind === "rect") expect(svg?.querySelector("rect")?.getAttribute("rx")).toBe("9");
    if (kind === "polygon")
      expect(svg?.querySelector("polygon")?.getAttribute("points")?.split(" ")).toHaveLength(6);
    if (kind === "star")
      expect(svg?.querySelector("polygon")?.getAttribute("points")?.split(" ")).toHaveLength(14);
  });

  it("keeps radius and stroke in insertion reference units", () => {
    const container = renderPreset({
      id: "rounded-outline",
      label: "Rounded outline",
      shape: { kind: "rect", cornerRadius: 18 },
      fill: { kind: "color", color: "transparent" },
      stroke: { color: "#123456", width: 12 },
      preview,
    });
    const outline = container.querySelector('rect[fill="none"][stroke="#123456"]');

    expect(outline?.getAttribute("rx")).toBe("18");
    expect(outline?.getAttribute("stroke-width")).toBe("12");
  });

  it("renders authored SVG path data and viewBox", () => {
    const pathData = "M0 0 L40 0 L20 30 Z";
    const container = renderPreset({
      id: "path",
      label: "Path",
      shape: { kind: "path", pathData, viewBox: { width: 40, height: 30 } },
      fill: { kind: "color", color: "#ef4444" },
      preview,
    });
    const svg = container.querySelector("svg[data-composition-shape='path']");

    expect(svg?.getAttribute("viewBox")).toBe("0 0 40 30");
    expect(svg?.querySelector(`path[d='${pathData}'][fill='#ef4444']`)).not.toBeNull();
  });

  it("renders linear gradient stops in SVG coordinates", () => {
    const container = renderPreset({
      id: "gradient",
      label: "Gradient",
      shape: { kind: "rect" },
      fill: {
        kind: "gradient",
        gradient: {
          type: "linear",
          angle: 45,
          stops: [
            { offset: 0, color: "#f00" },
            { offset: 1, color: "#00f" },
          ],
        },
      },
      preview,
    });
    const gradient = container.querySelector("linearGradient");

    expect(gradient?.querySelector("stop[offset='0'][stop-color='#f00']")).not.toBeNull();
    expect(gradient?.querySelector("stop[offset='1'][stop-color='#00f']")).not.toBeNull();
  });

  it.each([
    ["cover", "xMidYMid slice"],
    ["contain", "xMidYMid meet"],
    ["stretch", "none"],
  ] as const)("renders image fill fit %s", (fit, preserveAspectRatio) => {
    const container = renderPreset({
      id: fit,
      label: fit,
      shape: { kind: "ellipse" },
      fill: { kind: "image", image: { src: "/sample.png", fit } },
      preview,
    });
    const image = container.querySelector("[data-shape-image]");

    expect(image?.getAttribute("href")).toBe("/sample.png");
    expect(image?.getAttribute("preserveAspectRatio")).toBe(preserveAspectRatio);
    expect(image?.getAttribute("clip-path")).toMatch(/^url\(#.+-clip\)$/);
  });

  it("renders tile image fills through an SVG pattern", () => {
    const container = renderPreset({
      id: "tile",
      label: "Tile",
      shape: { kind: "rect" },
      fill: { kind: "image", image: { src: "/sample.png", fit: "tile" } },
      preview,
    });

    expect(container.querySelector("pattern image")?.getAttribute("href")).toBe("/sample.png");
    expect(container.querySelector("rect[fill^='url(#']")).not.toBeNull();
  });
});
