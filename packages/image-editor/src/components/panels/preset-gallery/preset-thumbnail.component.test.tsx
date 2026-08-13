import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PresetPreview } from "../../../config/config.types";
import { deriveTextPreview } from "../../../config/presets/derive-text-preview";
import { PresetThumbnail } from "./preset-thumbnail.component";

afterEach(cleanup);

describe("PresetThumbnail rich text segments", () => {
  it("renders ordered, positioned composition layers", () => {
    const { container } = render(
      <PresetThumbnail
        preview={{
          kind: "composition",
          bounds: { x: 0.1, y: 0.2, width: 0.8, height: 0.4 },
          layers: [
            {
              kind: "shape",
              layout: { x: 0.1, y: 0.2, width: 0.8, height: 0.4 },
              shape: { kind: "rect" },
              style: { background: "#dc2626" },
            },
            {
              kind: "text",
              layout: { x: 0.2, y: 0.3, width: 0.6, height: 0.1 },
              sample: "Banner",
              style: { color: "#ffffff" },
            },
          ],
        }}
      />,
    );
    const layers = container.querySelectorAll("[data-composition-layer]");
    expect(layers).toHaveLength(2);
    expect(layers[0].getAttribute("data-composition-layer")).toBe("shape");
    expect(layers[1].getAttribute("data-composition-layer")).toBe("text");
    expect((layers[1] as HTMLElement).style.left).toBe("12.5%");
    expect(container.textContent).toContain("Banner");
  });

  it("preserves multiline composition text and run segments", () => {
    const { container } = render(
      <PresetThumbnail
        preview={{
          kind: "composition",
          bounds: { x: 0, y: 0, width: 1, height: 1 },
          layers: [
            {
              kind: "text",
              layout: { x: 0, y: 0, width: 1, height: 1 },
              sample: "AB\nCD",
              style: { color: "#2563eb" },
              segments: [
                { start: 1, end: 2, style: { color: "#ef4444" } },
                { start: 3, end: 4, style: { fontStyle: "italic" } },
              ],
            },
          ],
        }}
      />,
    );

    expect(container.querySelectorAll("[data-composition-layer] .block")).toHaveLength(2);
    expect(screen.getByText("B")).toHaveStyle({ color: "#ef4444" });
    expect(screen.getByText("C")).toHaveStyle({ fontStyle: "italic" });
  });

  it("positions rotated layers from the top-left transform origin", () => {
    const { container } = render(
      <PresetThumbnail
        preview={{
          kind: "composition",
          bounds: { x: 0, y: 0.3, width: 0.2, height: 0.4 },
          layers: [
            {
              kind: "shape",
              layout: { x: 0.2, y: 0.3, width: 0.4, height: 0.2, rotation: 90 },
              shape: { kind: "rect" },
              style: { background: "#000000" },
            },
          ],
        }}
      />,
    );

    expect(container.querySelector<HTMLElement>("[data-composition-layer]")).toHaveStyle({
      transform: "rotate(90deg)",
      transformOrigin: "top left",
    });
  });

  it("splits a styled UTF-16 range across preserved preview lines", () => {
    const preview: PresetPreview = {
      kind: "text",
      sample: "AB\nCD",
      style: {
        color: "#2563eb",
        fontWeight: "bold",
        background: "#fde68a",
        backgroundOpacity: 0.5,
        borderRadius: "0.25em",
        padding: "0.1em 0.3em",
      },
      segments: [
        { start: 1, end: 2, style: { color: "#ef4444", fontStyle: "italic" } },
        { start: 3, end: 4, style: { color: "#ef4444", fontStyle: "italic" } },
      ],
    };

    render(<PresetThumbnail preview={preview} />);

    expect(screen.getByText("B")).toHaveStyle("color: #ef4444; font-style: italic");
    expect(screen.getByText("C")).toHaveStyle("color: #ef4444; font-style: italic");
    expect(screen.getByText("A")).not.toHaveStyle("font-style: italic");
    expect(screen.getByText("D")).not.toHaveStyle("font-style: italic");
    expect(screen.getByText("A")).toHaveStyle("color: #2563eb; font-weight: bold");
  });

  it("renders a highlight behind gradient glyphs on separate layers", () => {
    const { container } = render(
      <PresetThumbnail
        preview={{
          kind: "text",
          sample: "Both",
          style: {
            background: "#fde68a",
            textGradient: "linear-gradient(90deg, #f00, #00f)",
          },
        }}
      />,
    );

    const glyph = container.querySelector('[data-text-preview-glyph][style*="background-image"]');
    if (!glyph) {
      throw new Error("Expected gradient glyph to be rendered");
    }
    expect(glyph).toHaveStyle({
      backgroundImage: "linear-gradient(90deg, #f00, #00f)",
      color: "transparent",
    });
    expect(glyph.parentElement).toHaveStyle({ background: "#fde68a" });
  });

  it("renders a run highlight and run gradient on separate layers", () => {
    render(
      <PresetThumbnail
        preview={{
          kind: "text",
          sample: "Run",
          segments: [
            {
              start: 0,
              end: 3,
              style: {
                background: "#22c55e",
                textGradient: "linear-gradient(90deg, #fff, #000)",
              },
            },
          ],
        }}
      />,
    );

    const glyph = screen.getByText("Run");
    expect(glyph).toHaveStyle({
      backgroundImage: "linear-gradient(90deg, #fff, #000)",
      color: "transparent",
    });
    expect(glyph.parentElement).toHaveStyle({ background: "#22c55e" });
  });

  it("renders segmented empty lines through the base glyph and highlight layers", () => {
    const { container } = render(
      <PresetThumbnail
        preview={{
          kind: "text",
          sample: "A\n\nB",
          style: {
            fontFamily: "Georgia",
            background: "#fde68a",
            textGradient: "linear-gradient(90deg, #f00, #00f)",
          },
          segments: [{ start: 0, end: 1, style: { fontWeight: "bold" } }],
        }}
      />,
    );

    const glyph = [...container.querySelectorAll("[data-text-preview-glyph]")].find(
      (candidate) => candidate.textContent === "\u00A0",
    );
    expect(glyph).toHaveStyle({
      fontFamily: "Georgia",
      backgroundImage: "linear-gradient(90deg, #f00, #00f)",
      color: "transparent",
    });
    expect(glyph?.parentElement).toHaveStyle({ background: "#fde68a" });
  });

  it("clears and replaces a base highlight per resolved interval", () => {
    const preview = deriveTextPreview({
      text: "ABC",
      backgroundColor: "#fde68a",
      runOverrides: [
        { start: 0, end: 1, style: { backgroundColor: null } },
        { start: 1, end: 2, style: { backgroundColor: "#22c55e" } },
      ],
    });

    render(<PresetThumbnail preview={preview} />);

    const clearedHighlight = screen.getByText("A").parentElement;
    const replacedHighlight = screen.getByText("B").parentElement;
    const baseHighlight = screen.getByText("C").parentElement;
    expect(clearedHighlight).toHaveStyle({ background: "transparent" });
    expect(replacedHighlight).toHaveStyle({ background: "#22c55e" });
    expect(baseHighlight).toHaveStyle({ background: "#fde68a" });
    for (const highlight of [clearedHighlight, replacedHighlight]) {
      let ancestor = highlight?.parentElement;
      while (ancestor) {
        expect(ancestor).not.toHaveStyle({ background: "#fde68a" });
        ancestor = ancestor.parentElement;
      }
    }
  });

  it("renders a solid run override without activating gradient clipping", () => {
    render(
      <PresetThumbnail
        preview={{
          kind: "text",
          sample: "AB",
          style: { textGradient: "linear-gradient(90deg, #f00, #00f)" },
          segments: [{ start: 1, end: 2, style: { color: "#0f0", textGradient: null } }],
        }}
      />,
    );

    const glyph = screen.getByText("B").closest("[data-text-preview-glyph]");
    expect(glyph).toHaveStyle({
      backgroundImage: "none",
      backgroundClip: "border-box",
      color: "#0f0",
    });
  });
});
