import type { EngineCore } from "../engine-core";
import type {
  ResolvedTextBackground,
  StrokeGradient,
  TextBackgroundOptions,
  TextBackgroundPadding,
  TextCurve,
  TextCurveDirection,
  TextGradient,
  TextRunStyle,
  TextRunStyleUpdate,
  TextTransform,
} from "./block.types";
import * as H from "./block-api-helpers";
import { BlockTextBackgroundAPI } from "./block-text-background-api";
import { BlockTextEditingAPI } from "./block-text-editing-api";
import { createTextBlock } from "./block-text-placement";
import {
  TEXT_ALIGN,
  TEXT_AUTO_WIDTH,
  TEXT_CURVE_DIRECTION,
  TEXT_CURVE_RADIUS,
  TEXT_LINE_HEIGHT,
  TEXT_RUNS,
  TEXT_VERTICAL_ALIGN,
} from "./property-keys";
import { setStyleOnRange as utilSetStyleOnRange } from "./text-run-utils";

/** Text editing sessions, range-based text editing, and text block placement. */
export class BlockTextAPI extends BlockTextEditingAPI {
  #engine: EngineCore;
  #background: BlockTextBackgroundAPI;

  constructor(engine: EngineCore) {
    super(engine);
    this.#engine = engine;
    this.#background = new BlockTextBackgroundAPI(engine);
  }

  /** Applies a partial style to [start, end). `null` on a field clears it. */
  setTextStyle(blockId: number, start: number, end: number, styleUpdate: TextRunStyleUpdate): void {
    const session = this.getTextEditingSession(blockId);
    if (session) {
      session.setTextStyle(start, end, styleUpdate);
    } else {
      const runs = this.getTextRuns(blockId);
      const newRuns = utilSetStyleOnRange(runs, start, end, styleUpdate);
      H.setProperty(this.#engine, blockId, TEXT_RUNS, newRuns);
    }
  }

  setTextColor(blockId: number, start: number, end: number, color: string): void {
    this.setTextStyle(blockId, start, end, { fill: color });
  }
  setTextFontSize(blockId: number, start: number, end: number, fontSize: number): void {
    this.setTextStyle(blockId, start, end, { fontSize });
  }
  setTextFontFamily(blockId: number, start: number, end: number, fontFamily: string): void {
    this.setTextStyle(blockId, start, end, { fontFamily });
  }
  setTextFontWeight(blockId: number, start: number, end: number, fontWeight: string): void {
    this.setTextStyle(blockId, start, end, { fontWeight });
  }

  toggleBoldText(blockId: number, start: number, end: number): void {
    const session = this.getTextEditingSession(blockId);
    if (session) {
      session.toggleBold(start, end);
    } else {
      const current = this.#styleValueAt(blockId, start, "fontWeight", "normal");
      const newWeight = current === "bold" ? "normal" : "bold";
      this.setTextStyle(blockId, start, end, { fontWeight: newWeight });
    }
  }

  toggleItalicText(blockId: number, start: number, end: number): void {
    const session = this.getTextEditingSession(blockId);
    if (session) {
      session.toggleItalic(start, end);
    } else {
      const current = this.#styleValueAt(blockId, start, "fontStyle", "normal");
      const newStyle = current === "italic" ? "normal" : "italic";
      this.setTextStyle(blockId, start, end, { fontStyle: newStyle });
    }
  }

  /** Resolve a run style value at char `start`, falling back when unset. */
  #styleValueAt(blockId: number, start: number, key: keyof TextRunStyle, fallback: string): string {
    let offset = 0;
    for (const run of this.getTextRuns(blockId)) {
      if (offset + run.text.length > start) return (run.style[key] as string) ?? fallback;
      offset += run.text.length;
    }
    return fallback;
  }

  setTextAlign(blockId: number, align: string): void {
    H.setProperty(this.#engine, blockId, TEXT_ALIGN, align);
  }
  setTextLineHeight(blockId: number, lineHeight: number): void {
    H.setProperty(this.#engine, blockId, TEXT_LINE_HEIGHT, lineHeight);
  }
  setTextVerticalAlign(blockId: number, align: string): void {
    H.setProperty(this.#engine, blockId, TEXT_VERTICAL_ALIGN, align);
  }

  /** Auto-width hugs the text to its content; off keeps the stored width. */
  setTextAutoWidth(blockId: number, enabled: boolean): void {
    H.setBool(this.#engine, blockId, TEXT_AUTO_WIDTH, enabled);
  }
  getTextAutoWidth(blockId: number): boolean {
    return H.getBool(this.#engine, blockId, TEXT_AUTO_WIDTH);
  }

  /** radius > 0 curves; radius <= 0 clears (flat). One batched undo entry. */
  setTextCurve(blockId: number, radius: number, direction: TextCurveDirection): void {
    this.#engine.beginBatch();
    H.setProperty(this.#engine, blockId, TEXT_CURVE_RADIUS, radius > 0 ? radius : 0);
    H.setProperty(this.#engine, blockId, TEXT_CURVE_DIRECTION, direction);
    this.#engine.endBatch();
  }

  /** Returns null when flat (radius <= 0 / absent). */
  getTextCurve(blockId: number): TextCurve | null {
    const radius = H.getFloat(this.#engine, blockId, TEXT_CURVE_RADIUS);
    if (!(radius > 0)) return null;
    const dir = H.getString(this.#engine, blockId, TEXT_CURVE_DIRECTION);
    return { radius, direction: dir === "down" ? "down" : "up" };
  }

  // ── Text background box ───────────────────────────

  supportsTextBackground(blockId: number): boolean {
    return this.#background.supportsTextBackground(blockId);
  }
  setTextBackground(blockId: number, opts: TextBackgroundOptions): void {
    this.#background.setTextBackground(blockId, opts);
  }
  getTextBackground(blockId: number): ResolvedTextBackground {
    return this.#background.getTextBackground(blockId);
  }
  setTextBackgroundEnabled(blockId: number, enabled: boolean): void {
    this.#background.setTextBackgroundEnabled(blockId, enabled);
  }
  isTextBackgroundEnabled(blockId: number): boolean {
    return this.#background.isTextBackgroundEnabled(blockId);
  }

  /** Per-run pill highlight behind [start, end) — unrelated to the block-level box. */
  setTextBackgroundColor(blockId: number, start: number, end: number, color?: string): void {
    this.setTextStyle(blockId, start, end, { backgroundColor: color });
  }

  /** Opacity (0..1) of the per-run highlight pill; unset restores full opacity. */
  setTextBackgroundOpacity(blockId: number, start: number, end: number, opacity?: number): void {
    this.setTextStyle(blockId, start, end, { backgroundOpacity: opacity ?? null });
  }

  /** Corner radius (px) of the per-run highlight pill; unset restores 0. */
  setTextBackgroundCornerRadius(
    blockId: number,
    start: number,
    end: number,
    radius?: number,
  ): void {
    this.setTextStyle(blockId, start, end, { backgroundCornerRadius: radius ?? null });
  }

  /** Per-side px padding of the per-run highlight pill; unset sides default to 0. */
  setTextBackgroundPadding(
    blockId: number,
    start: number,
    end: number,
    padding: Partial<TextBackgroundPadding> | undefined,
  ): void {
    this.setTextStyle(blockId, start, end, { backgroundPadding: padding ?? null });
  }

  setTextTransform(blockId: number, start: number, end: number, transform: TextTransform): void {
    this.setTextStyle(blockId, start, end, { textTransform: transform });
  }

  setTextShadow(
    blockId: number,
    start: number,
    end: number,
    shadow: { color?: string; blur?: number; offsetX?: number; offsetY?: number },
  ): void {
    this.setTextStyle(blockId, start, end, {
      textShadowColor: shadow.color,
      textShadowBlur: shadow.blur,
      textShadowOffsetX: shadow.offsetX,
      textShadowOffsetY: shadow.offsetY,
    });
  }

  setTextStroke(
    blockId: number,
    start: number,
    end: number,
    stroke: { color?: string; width?: number; gradient?: StrokeGradient | null },
  ): void {
    const gradient = stroke.gradient
      ? {
          type: "linear" as const,
          angle: stroke.gradient.angle,
          stops: stroke.gradient.stops.map((stop) => ({ ...stop })),
        }
      : stroke.gradient;
    this.setTextStyle(blockId, start, end, {
      textStrokeColor: stroke.color,
      textStrokeWidth: stroke.width,
      textStrokeGradient: gradient,
    });
  }

  /** Fills [start, end) with a linear/radial gradient; `null` restores solid fill. Undoable. */
  setTextGradient(blockId: number, start: number, end: number, grad: TextGradient | null): void {
    this.setTextStyle(blockId, start, end, { fillGradient: grad });
  }

  /** Creates a text block with optional initial text, appends to parent. Single undo step. */
  addText(
    parentId: number,
    x: number,
    y: number,
    width: number,
    height: number,
    initialText?: string,
    opts?: { style?: Partial<TextRunStyle> },
  ): number {
    return createTextBlock(this.#engine, parentId, x, y, width, height, initialText, opts);
  }
}
