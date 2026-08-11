/**
 * @vitest-environment happy-dom
 *
 * `updateTextNode` → node attrs for the background box. Covers the wiring the
 * resolver unit tests can't see: the box lands on ONE `backgroundBox` attr, the
 * generic `shadow/*` + `stroke/*` keys stay inert until the box is enabled, the
 * node-level Konva shadow stays off in every case (box shadows are painted on
 * the 2D context), and curved text keeps the box data on the node.
 */

import { describe, expect, it } from "vitest";
import type { BlockData, Color } from "../block/block.types";
import {
  FILL_ENABLED,
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
  TEXT_BACKGROUND_PADDING_LEFT,
  TEXT_CURVE_RADIUS,
  TEXT_RUNS,
} from "../block/property-keys";
import type { FormattedText } from "./formatted-text";
import type { TextBackgroundBoxStyle } from "./formatted-text-box-render";
import { updateTextNode } from "./konva-text-updater";

const RED: Color = { r: 1, g: 0, b: 0, a: 1 };
const GREEN: Color = { r: 0, g: 1, b: 0, a: 1 };
const RUNS = [{ text: "Hi", style: { fontSize: 24, fontFamily: "Arial" } }];

interface Probe {
  node: FormattedText;
  box: () => TextBackgroundBoxStyle | null;
  /** The legacy full-frame `fill/enabled` colour, which DOES use `fillId`. */
  backgroundFill: () => string;
  shadowEnabledArgs: boolean[];
}

function makeProbe(): Probe {
  const attrs = new Map<string, unknown>();
  const shadowEnabledArgs: boolean[] = [];
  const noop = () => undefined;

  const node = {
    textRuns: noop,
    width: noop,
    align: noop,
    lineHeight: noop,
    verticalAlign: noop,
    padding: noop,
    wrap: noop,
    curveRadius: noop,
    curveDirection: noop,
    height: noop,
    shadowEnabled: (v?: boolean) => {
      if (v !== undefined) shadowEnabledArgs.push(v);
      return undefined;
    },
    getComputedHeight: () => 42,
    getComputedWidth: () => 80,
    getAttr: (k: string) => attrs.get(k),
    setAttr: (k: string, v: unknown) => {
      attrs.set(k, v);
    },
  } as unknown as FormattedText;

  return {
    node,
    box: () => (attrs.get("backgroundBox") as TextBackgroundBoxStyle | null) ?? null,
    backgroundFill: () => (attrs.get("backgroundFill") as string) ?? "",
    shadowEnabledArgs,
  };
}

function update(props: Record<string, unknown>, block?: BlockData, resolve?: () => BlockData) {
  const probe = makeProbe();
  updateTextNode(probe.node, { [TEXT_RUNS]: RUNS, ...props }, 200, 100, block, resolve);
  return probe;
}

describe("updateTextNode — backgroundBox attr", () => {
  it("writes null when the box is disabled", () => {
    expect(update({}).box()).toBeNull();
    expect(update({ [TEXT_BACKGROUND_ENABLED]: false }).box()).toBeNull();
  });

  it("keeps shadow/stroke inert while the box is disabled", () => {
    const probe = update({
      [SHADOW_ENABLED]: true,
      [SHADOW_COLOR]: RED,
      [SHADOW_BLUR]: 12,
      [STROKE_ENABLED]: true,
      [STROKE_COLOR]: RED,
      [STROKE_WIDTH]: 4,
    });

    expect(probe.box()).toBeNull();
  });

  it("folds colour, radius, padding, shadow and stroke into one attr", () => {
    const probe = update({
      [TEXT_BACKGROUND_ENABLED]: true,
      [TEXT_BACKGROUND_COLOR]: RED,
      [TEXT_BACKGROUND_CORNER_RADIUS]: 9,
      [TEXT_BACKGROUND_PADDING_LEFT]: 7,
      [SHADOW_ENABLED]: true,
      [SHADOW_COLOR]: RED,
      [SHADOW_BLUR]: 12,
      [SHADOW_OFFSET_X]: 3,
      [SHADOW_OFFSET_Y]: -3,
      [STROKE_ENABLED]: true,
      [STROKE_COLOR]: GREEN,
      [STROKE_WIDTH]: 4,
    });

    expect(probe.box()).toEqual({
      color: "#ff0000",
      cornerRadius: 9,
      padding: { top: 0, right: 0, bottom: 0, left: 7 },
      shadow: { color: "#ff0000", blur: 12, offsetX: 3, offsetY: -3 },
      stroke: { color: "#00ff00", width: 4 },
    });
  });

  it("returns the stored cornerRadius unclamped (clamping is render-time)", () => {
    const probe = update({
      [TEXT_BACKGROUND_ENABLED]: true,
      [TEXT_BACKGROUND_CORNER_RADIUS]: 9999,
    });

    expect(probe.box()?.cornerRadius).toBe(9999);
  });

  it("keeps the box colour independent of the fill sub-block", () => {
    const block = { fillId: 3 } as unknown as BlockData;
    const fillBlock = { properties: { [FILL_SOLID_COLOR]: GREEN } } as unknown as BlockData;

    const probe = update(
      { [TEXT_BACKGROUND_ENABLED]: true, [FILL_ENABLED]: true },
      block,
      () => fillBlock,
    );

    // The legacy full-frame fill still resolves through `fillId`…
    expect(probe.backgroundFill()).toBe("#00ff00");
    // …while the box paints exactly what `getTextBackground` reports.
    expect(probe.box()?.color).toBe("#000000");
  });

  it("keeps the box data on the node for curved text (the paint is suppressed)", () => {
    const probe = update({
      [TEXT_CURVE_RADIUS]: 300,
      [TEXT_BACKGROUND_ENABLED]: true,
      [TEXT_BACKGROUND_COLOR]: RED,
    });

    expect(probe.box()).not.toBeNull();
    expect(probe.box()?.color).toBe("#ff0000");
  });
});

describe("updateTextNode — node-level shadow stays off", () => {
  it.each([
    ["box off", {}],
    ["box on", { [TEXT_BACKGROUND_ENABLED]: true }],
    [
      "box on with a shadow",
      {
        [TEXT_BACKGROUND_ENABLED]: true,
        [SHADOW_ENABLED]: true,
        [SHADOW_COLOR]: RED,
        [SHADOW_BLUR]: 20,
      },
    ],
  ])("never enables the Konva node shadow (%s)", (_label, props) => {
    const probe = update(props);

    expect(probe.shadowEnabledArgs).toEqual([false]);
  });
});
