/**
 * @vitest-environment happy-dom
 *
 * Auto-width fit-back: a single line sized to its own computed auto-width must
 * NOT wrap when re-laid out with wrapping enabled. Guards the "phantom second
 * line / doubled height" bug where a style preset (Times New Roman, italic,
 * letterSpacing 2, large fontSize) produced a selection box ~2 lines tall while
 * only one line of glyphs was visible.
 *
 * happy-dom has no real canvas 2D context, so `computeTextLines` is fed a stub
 * measure context with a deterministic per-glyph advance. That lets us exercise
 * the letter-spacing + epsilon paths precisely; the real-canvas italic overhang
 * (actualBoundingBoxRight vs advance) can't be reproduced in a unit test, so the
 * font-relative slack in `lineTrailingSlack` covers it — manual-verification gap.
 */

import { describe, expect, it, vi } from "vitest";
import type { TextRun } from "../block/block.types";

const CHAR_W = 10;

const stubCtx = vi.hoisted(() => {
  const CW = 10;
  return {
    font: "",
    measureText: (t: string) => ({ width: t.length * CW }),
  } as unknown as CanvasRenderingContext2D;
});

vi.mock("./formatted-text-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./formatted-text-utils")>();
  return { ...actual, getDummyContext: () => stubCtx };
});

import { computeTextLines } from "./formatted-text-layout";
import { lineTrailingSlack, type TextLine } from "./formatted-text-utils";

/** Replicates FormattedText.getComputedWidth() (padding 0) for the layout output. */
function huggedWidth(lines: TextLine[]): number {
  return lines.reduce((max, l) => Math.max(max, l.width + lineTrailingSlack(l)), 0);
}

function measure(runs: TextRun[], wrap: string, width: number): TextLine[] {
  const plainText = runs.map((r) => r.text).join("");
  return computeTextLines(runs, { width, padding: 0, wrap, lineHeight: 1.2, plainText });
}

describe("auto-width fit-back (no phantom wrap)", () => {
  it("keeps an italic, letter-spaced line to one line at its auto-width", () => {
    const runs: TextRun[] = [
      {
        text: "Elegant",
        style: {
          fontSize: 48,
          fontFamily: "Times New Roman",
          fontStyle: "italic",
          letterSpacing: 2,
        },
      },
    ];

    const measured = measure(runs, "none", 99999);
    expect(measured).toHaveLength(1);

    const w = huggedWidth(measured);
    // Slack must exceed the trailing letter-spacing the DOM overlay adds after
    // the last glyph, plus room for italic overhang.
    expect(w).toBeGreaterThan(measured[0].width + 2);

    const relaid = measure(runs, "word", w);
    expect(relaid).toHaveLength(1);
  });

  it("tolerates a sub-pixel width shortfall instead of wrapping (fit epsilon)", () => {
    const runs: TextRun[] = [{ text: "Hello", style: { fontSize: 24, fontFamily: "Arial" } }];

    const measured = measure(runs, "none", 99999);
    const exact = measured[0].width; // no slack: non-italic, no letter-spacing
    expect(exact).toBe("Hello".length * CHAR_W);

    // A fraction-of-a-pixel float error must not trigger a phantom second line.
    const relaid = measure(runs, "word", exact - 0.4);
    expect(relaid).toHaveLength(1);
  });
});
