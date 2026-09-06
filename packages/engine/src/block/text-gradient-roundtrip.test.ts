import { describe, expect, it } from "vitest";
import type { TextGradient, TextRun } from "./block.types";
import { cssStringToRunStyle, runStyleToCssString, textRunStyleToCssPatch } from "./lexical-bridge";
import { gradientsEqual, mergeAdjacentRuns, stylesEqual } from "./text-run-utils";

const linear = (angle: number): TextGradient => ({
  type: "linear",
  angle,
  stops: [
    { offset: 0, color: "#ff0000" },
    { offset: 1, color: "#00ff00" },
  ],
});

describe("gradientsEqual / stylesEqual", () => {
  it("treats identical gradients (incl. undefined angle default) as equal", () => {
    expect(gradientsEqual(linear(0), linear(0))).toBe(true);
    expect(gradientsEqual({ type: "linear", stops: linear(0).stops }, linear(0))).toBe(true);
  });

  it("distinguishes by type, angle, and stops", () => {
    expect(gradientsEqual(linear(0), linear(90))).toBe(false);
    expect(gradientsEqual(linear(0), { type: "radial", stops: linear(0).stops })).toBe(false);
    expect(
      gradientsEqual(linear(0), {
        type: "linear",
        angle: 0,
        stops: [{ offset: 0, color: "#000000" }],
      }),
    ).toBe(false);
    expect(gradientsEqual(linear(0), undefined)).toBe(false);
  });

  it("stylesEqual folds the gradient into run equality", () => {
    expect(stylesEqual({ fillGradient: linear(0) }, { fillGradient: linear(0) })).toBe(true);
    expect(stylesEqual({ fillGradient: linear(0) }, { fillGradient: linear(90) })).toBe(false);
  });
});

describe("mergeAdjacentRuns with gradients", () => {
  it("does NOT merge runs whose gradients differ", () => {
    const runs: TextRun[] = [
      { text: "A", style: { fillGradient: linear(0) } },
      { text: "B", style: { fillGradient: linear(90) } },
    ];
    expect(mergeAdjacentRuns(runs)).toHaveLength(2);
  });

  it("DOES merge runs with identical gradients", () => {
    const runs: TextRun[] = [
      { text: "A", style: { fillGradient: linear(45) } },
      { text: "B", style: { fillGradient: linear(45) } },
    ];
    const merged = mergeAdjacentRuns(runs);
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe("AB");
  });
});

describe("lexical CSS round-trip preserves the gradient", () => {
  it("serializes and parses fillGradient losslessly (editing keeps the gradient)", () => {
    const style = { fill: "#ff0000", fillGradient: linear(30) };
    const css = runStyleToCssString(style);
    expect(css).toContain("--text-fill-gradient:");

    const parsed = cssStringToRunStyle(css);
    expect(parsed.fillGradient).toEqual(linear(30));
    // Solid fill is still emitted so the flat editor overlay shows a colour.
    expect(parsed.fill).toBe("#ff0000");
  });

  it("ignores a malformed gradient value rather than throwing", () => {
    const parsed = cssStringToRunStyle("--text-fill-gradient: not%20json");
    expect(parsed.fillGradient).toBeUndefined();
  });
});

describe("textRunStyleToCssPatch gradient (live editing set/clear)", () => {
  it("SETS the CSS var to the encoded gradient when a gradient is provided", () => {
    const patch = textRunStyleToCssPatch({ fillGradient: linear(30) });
    expect(patch["--text-fill-gradient"]).toBe(encodeURIComponent(JSON.stringify(linear(30))));

    // The set value round-trips back through the parser losslessly.
    const parsed = cssStringToRunStyle(`--text-fill-gradient: ${patch["--text-fill-gradient"]}`);
    expect(parsed.fillGradient).toEqual(linear(30));
  });

  it("CLEARS the CSS var (null) when fillGradient is set to null", () => {
    const patch = textRunStyleToCssPatch({ fillGradient: null });
    expect("--text-fill-gradient" in patch).toBe(true);
    expect(patch["--text-fill-gradient"]).toBeNull();
  });

  it("does not touch the CSS var when fillGradient is absent from the update", () => {
    const patch = textRunStyleToCssPatch({ fill: "#123456" });
    expect("--text-fill-gradient" in patch).toBe(false);
  });

  it("set then clear round-trips through the CSS string (editing keeps/removes the gradient)", () => {
    // Set: serialize a gradient and confirm it parses back.
    const withGrad = runStyleToCssString({ fillGradient: linear(90) });
    expect(cssStringToRunStyle(withGrad).fillGradient).toEqual(linear(90));

    // Clear: a run without a gradient emits no var, so the parse yields undefined.
    const cleared = runStyleToCssString({ fill: "#000000" });
    expect(cleared).not.toContain("--text-fill-gradient");
    expect(cssStringToRunStyle(cleared).fillGradient).toBeUndefined();
  });
});
