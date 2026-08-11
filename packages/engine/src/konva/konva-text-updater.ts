import type { BlockData, Color, TextCurveDirection, TextRun } from "../block/block.types";
import {
  FILL_COLOR,
  FILL_ENABLED,
  FILL_SOLID_COLOR,
  FONT_FAMILY,
  FONT_SIZE,
  TEXT_ALIGN,
  TEXT_AUTO_HEIGHT,
  TEXT_AUTO_WIDTH,
  TEXT_CONTENT,
  TEXT_CURVE_DIRECTION,
  TEXT_CURVE_RADIUS,
  TEXT_LINE_HEIGHT,
  TEXT_PADDING,
  TEXT_RUNS,
  TEXT_VERTICAL_ALIGN,
  TEXT_WRAP,
} from "../block/property-keys";
import { colorToHex } from "../utils/color";
import type { FormattedText } from "./formatted-text";
import { resolveTextBackgroundBox } from "./konva-text-background";

export function updateTextNode(
  textNode: FormattedText,
  props: Record<string, unknown>,
  width: number,
  height: number,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): { computedHeight: number | null; computedWidth: number | null } {
  let runs = props[TEXT_RUNS] as TextRun[] | undefined;
  if (!runs || !Array.isArray(runs) || runs.length === 0) {
    // legacy-scene compat; editor no longer seeds these keys.
    const text = (props[TEXT_CONTENT] as string) ?? "Text";
    const fillColor = props[FILL_COLOR];
    const fill =
      fillColor && typeof fillColor === "object" ? colorToHex(fillColor as Color) : "#000000";
    runs = [
      {
        text,
        style: {
          fontSize: (props[FONT_SIZE] as number) ?? 24,
          fontFamily: (props[FONT_FAMILY] as string) ?? "Arial",
          fill,
        },
      },
    ];
  }
  textNode.textRuns(runs);
  const autoWidth = (props[TEXT_AUTO_WIDTH] as boolean) ?? false;
  textNode.align((props[TEXT_ALIGN] as string) ?? "left");
  textNode.lineHeight((props[TEXT_LINE_HEIGHT] as number) ?? 1.2);
  textNode.verticalAlign((props[TEXT_VERTICAL_ALIGN] as string) ?? "top");
  textNode.padding((props[TEXT_PADDING] as number) ?? 0);
  // Auto-width disables wrapping so the box hugs the widest line; otherwise use
  // the stored wrap mode and the block's stored width.
  textNode.wrap(autoWidth ? "none" : ((props[TEXT_WRAP] as string) ?? "word"));
  textNode.curveRadius((props[TEXT_CURVE_RADIUS] as number) ?? 0);
  textNode.curveDirection((props[TEXT_CURVE_DIRECTION] as TextCurveDirection) ?? "up");

  let computedWidth: number | null = null;
  if (autoWidth) {
    // A large layout width keeps measurement from wrapping; the content-derived
    // width is then written back to both the node and (via the adapter) the block.
    textNode.width(99999);
    const computed = textNode.getComputedWidth();
    textNode.width(Math.max(computed, 10));
    computedWidth = computed;
  } else {
    textNode.width(width);
  }

  let bgFill = "";
  const fillEnabled = (props[FILL_ENABLED] as boolean) ?? false;
  if (fillEnabled) {
    let bgColor: Color | undefined;
    if (block?.fillId != null && resolveBlock) {
      const fillBlock = resolveBlock(block.fillId);
      if (fillBlock) {
        const c = fillBlock.properties[FILL_SOLID_COLOR];
        if (c && typeof c === "object") bgColor = c as Color;
      }
    }
    if (!bgColor) {
      const fc = props[FILL_COLOR];
      if (fc && typeof fc === "object") bgColor = fc as Color;
    }
    if (bgColor) bgFill = colorToHex(bgColor);
  }
  textNode.setAttr("backgroundFill", bgFill);

  // Not in FormattedText's watchAttrs: the box never affects line breaking, so
  // changing it must not invalidate the layout (mirrors `backgroundFill`).
  // Resolved from `props` alone — unlike `backgroundFill` above, the box colour
  // deliberately does not borrow the `fillId` sub-block, so what it paints is
  // exactly what `getTextBackground` reports.
  textNode.setAttr("backgroundBox", resolveTextBackgroundBox(props));

  // Text shadow is drawn per-run inside FormattedText (from the run style), so
  // the node-level shadow must stay off — even for legacy scenes that still
  // carry SHADOW_ENABLED — to avoid rendering a double shadow. The background
  // box's own shadow is painted on the 2D context, not by the node.
  textNode.shadowEnabled(false);

  const autoHeight = (props[TEXT_AUTO_HEIGHT] as boolean) ?? true;
  if (autoHeight) {
    const computed = textNode.getComputedHeight();
    textNode.height(Math.max(computed, 10));
    return { computedHeight: computed, computedWidth };
  }
  textNode.height(height);
  return { computedHeight: null, computedWidth };
}
