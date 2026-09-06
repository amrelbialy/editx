/**
 * @vitest-environment happy-dom
 *
 * Property resolution for the text background box. On a TEXT block the generic
 * `shadow/*` and `stroke/*` keys describe the BOX, and are inert unless
 * `text/background/enabled` is true.
 */

import { describe, expect, it } from "vitest";
import type { BlockData } from "../block/block.types";
import {
  FILL_SOLID_COLOR,
  SHADOW_BLUR,
  SHADOW_COLOR,
  SHADOW_ENABLED,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  STROKE_COLOR,
  STROKE_ENABLED,
  STROKE_WIDTH,
  TEXT_BACKGROUND_COLOR,
  TEXT_BACKGROUND_CORNER_RADIUS,
  TEXT_BACKGROUND_ENABLED,
  TEXT_BACKGROUND_GEOMETRY,
  TEXT_BACKGROUND_PADDING_BOTTOM,
  TEXT_BACKGROUND_PADDING_LEFT,
  TEXT_BACKGROUND_PADDING_RIGHT,
  TEXT_BACKGROUND_PADDING_TOP,
} from "../block/property-keys";
import { resolveTextBackgroundBox } from "./konva-text-background";

const RED = { r: 1, g: 0, b: 0, a: 1 };
const GREEN = { r: 0, g: 1, b: 0, a: 1 };

describe("resolveTextBackgroundBox", () => {
  it("returns null when the box is disabled", () => {
    expect(resolveTextBackgroundBox({})).toBeNull();
    expect(resolveTextBackgroundBox({ [TEXT_BACKGROUND_ENABLED]: false })).toBeNull();
  });

  it("makes shadow and stroke inert while the box is disabled", () => {
    const style = resolveTextBackgroundBox({
      [SHADOW_ENABLED]: true,
      [STROKE_ENABLED]: true,
      [STROKE_COLOR]: RED,
      [STROKE_WIDTH]: 4,
    });

    expect(style).toBeNull();
  });

  it("falls back to the property-store defaults when only enabled is set", () => {
    expect(resolveTextBackgroundBox({ [TEXT_BACKGROUND_ENABLED]: true })).toEqual({
      color: "#000000",
      geometry: "text-union",
      cornerRadius: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      shadow: null,
      stroke: null,
    });
  });

  it("resolves colour, radius and the four paddings", () => {
    const style = resolveTextBackgroundBox({
      [TEXT_BACKGROUND_ENABLED]: true,
      [TEXT_BACKGROUND_COLOR]: RED,
      [TEXT_BACKGROUND_CORNER_RADIUS]: 12,
      [TEXT_BACKGROUND_PADDING_TOP]: 1,
      [TEXT_BACKGROUND_PADDING_RIGHT]: 2,
      [TEXT_BACKGROUND_PADDING_BOTTOM]: -3,
      [TEXT_BACKGROUND_PADDING_LEFT]: 4,
    });

    expect(style?.color).toBe("#ff0000");
    expect(style?.cornerRadius).toBe(12);
    expect(style?.padding).toEqual({ top: 1, right: 2, bottom: -3, left: 4 });
  });

  it("resolves frame geometry and clamps its content insets", () => {
    const style = resolveTextBackgroundBox({
      [TEXT_BACKGROUND_ENABLED]: true,
      [TEXT_BACKGROUND_GEOMETRY]: "frame",
      [TEXT_BACKGROUND_PADDING_TOP]: -3,
      [TEXT_BACKGROUND_PADDING_RIGHT]: 8,
    });

    expect(style?.geometry).toBe("frame");
    expect(style?.padding).toEqual({ top: 0, right: 8, bottom: 0, left: 0 });
  });

  it("ignores the fill sub-block colour — the box reports and paints the store default", () => {
    // `getTextBackground` reads only `text/background/color`, so borrowing the
    // legacy full-frame fill colour here would make the panel swatch disagree
    // with the canvas.
    const fillBlock = { properties: { [FILL_SOLID_COLOR]: GREEN } } as unknown as BlockData;

    const style = resolveTextBackgroundBox({ [TEXT_BACKGROUND_ENABLED]: true });

    expect(style?.color).toBe("#000000");
    expect(fillBlock.properties[FILL_SOLID_COLOR]).toEqual(GREEN);
  });

  it("uses the explicit box colour when it is stored", () => {
    const style = resolveTextBackgroundBox({
      [TEXT_BACKGROUND_ENABLED]: true,
      [TEXT_BACKGROUND_COLOR]: RED,
    });

    expect(style?.color).toBe("#ff0000");
  });

  it("resolves an enabled shadow to the store's zeros, inventing nothing", () => {
    // Text blocks never seed SHADOW_*, so `getShadowBlur` / `getShadowOffsetX`
    // report 0 — the paint must agree, or the panel shows zeros over a
    // visibly shadowed box.
    expect(
      resolveTextBackgroundBox({ [TEXT_BACKGROUND_ENABLED]: true, [SHADOW_ENABLED]: true })?.shadow,
    ).toEqual({ color: "#000000", blur: 0, offsetX: 0, offsetY: 0 });
  });

  it("resolves the generic shadow keys onto the box", () => {
    const style = resolveTextBackgroundBox({
      [TEXT_BACKGROUND_ENABLED]: true,
      [SHADOW_ENABLED]: true,
      [SHADOW_COLOR]: RED,
      [SHADOW_BLUR]: 3,
      [SHADOW_OFFSET_X]: -2,
      [SHADOW_OFFSET_Y]: 5,
    });

    expect(style?.shadow).toEqual({ color: "#ff0000", blur: 3, offsetX: -2, offsetY: 5 });
  });

  it("resolves the generic stroke keys onto the box, ignoring a zero width", () => {
    const enabled = {
      [TEXT_BACKGROUND_ENABLED]: true,
      [STROKE_ENABLED]: true,
      [STROKE_COLOR]: GREEN,
    };

    expect(resolveTextBackgroundBox({ ...enabled, [STROKE_WIDTH]: 6 })?.stroke).toEqual({
      color: "#00ff00",
      width: 6,
    });
    expect(resolveTextBackgroundBox({ ...enabled, [STROKE_WIDTH]: 0 })?.stroke).toBeNull();
  });
});
