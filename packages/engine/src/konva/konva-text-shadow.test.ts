/**
 * @vitest-environment happy-dom
 *
 * Legacy-scene guard: text blocks draw their shadow per-run inside
 * FormattedText (from the run style). The node-level Konva shadow must stay off
 * — even when a legacy scene still carries SHADOW_ENABLED — so text never
 * renders a double shadow (the exact regression fixed by retiring the
 * block-level SHADOW_* branch in updateTextNode).
 */

import { describe, expect, it } from "vitest";
import {
  SHADOW_BLUR,
  SHADOW_COLOR,
  SHADOW_ENABLED,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  TEXT_RUNS,
} from "../block/property-keys";
import type { FormattedText } from "./formatted-text";
import { updateTextNode } from "./konva-text-updater";

function makeTextNode(): { node: FormattedText; shadowEnabledCalls: () => boolean[] } {
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
    shadowColor: noop,
    shadowOffsetX: noop,
    shadowOffsetY: noop,
    shadowBlur: noop,
    shadowForStrokeEnabled: noop,
    shadowEnabled: (v?: boolean) => {
      if (v !== undefined) shadowEnabledArgs.push(v);
      return undefined;
    },
    getComputedHeight: () => 42,
    getAttr: (k: string) => attrs.get(k),
    setAttr: (k: string, v: unknown) => {
      attrs.set(k, v);
    },
  } as unknown as FormattedText;

  return { node, shadowEnabledCalls: () => shadowEnabledArgs };
}

describe("updateTextNode shadow guard (legacy-scene)", () => {
  it("never enables the node-level shadow, even when SHADOW_ENABLED is true", () => {
    const fake = makeTextNode();

    // A legacy scene where the old block-level shadow flags are set.
    updateTextNode(
      fake.node,
      {
        [TEXT_RUNS]: [{ text: "Hi", style: { fontSize: 24, fontFamily: "Arial" } }],
        [SHADOW_ENABLED]: true,
        [SHADOW_COLOR]: { r: 0, g: 0, b: 0, a: 1 },
        [SHADOW_OFFSET_X]: 5,
        [SHADOW_OFFSET_Y]: 5,
        [SHADOW_BLUR]: 10,
      },
      100,
      50,
    );

    const calls = fake.shadowEnabledCalls();
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((v) => v === false)).toBe(true);
  });
});
