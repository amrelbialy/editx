import { describe, expect, it } from "vitest";
import type { TextRunStyle } from "./block.types";
import { cssStringToRunStyle, runStyleToCssString, textRunStyleToCssPatch } from "./lexical-bridge";

const HIGHLIGHT: TextRunStyle = {
  backgroundColor: "#fde68a",
  backgroundOpacity: 0.42,
  backgroundCornerRadius: 7,
  backgroundPadding: { top: -2, right: 9, bottom: 5, left: 13 },
};

describe("Lexical CSS per-run Highlight round-trip", () => {
  it("preserves opacity, radius, and signed asymmetric padding losslessly", () => {
    expect(cssStringToRunStyle(runStyleToCssString(HIGHLIGHT))).toMatchObject(HIGHLIGHT);
  });

  it("sets and clears every Highlight geometry CSS variable", () => {
    const setPatch = textRunStyleToCssPatch(HIGHLIGHT);
    expect(
      cssStringToRunStyle(
        Object.entries(setPatch)
          .map(([key, value]) => `${key}: ${value}`)
          .join("; "),
      ),
    ).toMatchObject(HIGHLIGHT);

    expect(
      textRunStyleToCssPatch({
        backgroundOpacity: null,
        backgroundCornerRadius: null,
        backgroundPadding: null,
      }),
    ).toEqual({
      "--text-background-opacity": null,
      "--text-background-corner-radius": null,
      "--text-background-padding": null,
    });
  });

  it("ignores malformed opacity, radius, and padding without throwing", () => {
    const parsed = cssStringToRunStyle(
      "--text-background-opacity: nope; " +
        "--text-background-corner-radius: NaN; " +
        "--text-background-padding: %7B%22left%22%3A%22wide%22%7D",
    );

    expect(parsed.backgroundOpacity).toBeUndefined();
    expect(parsed.backgroundCornerRadius).toBeUndefined();
    expect(parsed.backgroundPadding).toBeUndefined();
  });
});
