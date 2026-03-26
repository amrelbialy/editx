import type { TextRun, TextRunStyle } from "../block/block.types";
import {
  applyTextTransform,
  formatFont,
  getDummyContext,
  type LinePart,
  resolveStyle,
  type TextLine,
} from "./formatted-text-utils";

export interface TextLayoutConfig {
  width: number;
  padding: number;
  wrap: string;
  lineHeight: number;
  plainText: string;
}

/** Measure text width, accounting for letter spacing. */
function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: Required<TextRunStyle>,
  trailingSpacing = false,
): number {
  ctx.font = formatFont(style);
  const displayText = applyTextTransform(text, style.textTransform);
  if (style.letterSpacing !== 0 && displayText.length > 0) {
    let w = 0;
    for (let i = 0; i < displayText.length; i++) {
      w += ctx.measureText(displayText[i]).width;
      if (i < displayText.length - 1 || trailingSpacing) {
        w += style.letterSpacing;
      }
    }
    return w;
  }
  return ctx.measureText(displayText).width;
}

/** Build LinePart[] for a substring, using per-character resolved styles. */
function buildParts(
  ctx: CanvasRenderingContext2D,
  text: string,
  globalStartIdx: number,
  runs: TextRun[],
): LinePart[] {
  const parts: LinePart[] = [];

  let runCharStart = 0;
  let runIdx = 0;
  for (let r = 0; r < runs.length; r++) {
    const runEnd = runCharStart + runs[r].text.length;
    if (globalStartIdx < runEnd) {
      runIdx = r;
      break;
    }
    runCharStart = runEnd;
  }

  let currentStyle = resolveStyle(runs[runIdx]?.style ?? {});
  let currentText = "";
  let charGlobal = globalStartIdx;
  let runEnd = runCharStart + (runs[runIdx]?.text.length ?? 0);

  for (let i = 0; i < text.length; i++) {
    while (runIdx < runs.length - 1 && charGlobal >= runEnd) {
      runIdx++;
      runCharStart = runEnd;
      runEnd = runCharStart + runs[runIdx].text.length;
    }

    const charStyle = resolveStyle(runs[runIdx]?.style ?? {});
    const sameStyle =
      charStyle.fontSize === currentStyle.fontSize &&
      charStyle.fontFamily === currentStyle.fontFamily &&
      charStyle.fontWeight === currentStyle.fontWeight &&
      charStyle.fontStyle === currentStyle.fontStyle &&
      charStyle.fill === currentStyle.fill &&
      charStyle.letterSpacing === currentStyle.letterSpacing &&
      charStyle.textDecoration === currentStyle.textDecoration &&
      charStyle.backgroundColor === currentStyle.backgroundColor &&
      charStyle.textTransform === currentStyle.textTransform &&
      charStyle.textShadowColor === currentStyle.textShadowColor &&
      charStyle.textShadowBlur === currentStyle.textShadowBlur &&
      charStyle.textShadowOffsetX === currentStyle.textShadowOffsetX &&
      charStyle.textShadowOffsetY === currentStyle.textShadowOffsetY &&
      charStyle.textStrokeColor === currentStyle.textStrokeColor &&
      charStyle.textStrokeWidth === currentStyle.textStrokeWidth;

    if (!sameStyle && currentText.length > 0) {
      const w = measureText(ctx, currentText, currentStyle, true);
      parts.push({ text: currentText, style: currentStyle, width: w });
      currentText = "";
      currentStyle = charStyle;
    } else if (!sameStyle) {
      currentStyle = charStyle;
    }

    currentText += text[i];
    charGlobal++;
  }

  if (currentText.length > 0) {
    const w = measureText(ctx, currentText, currentStyle);
    parts.push({ text: currentText, style: currentStyle, width: w });
  }

  return parts;
}

/** Compute wrapped text lines from runs, using binary search line breaking. */
export function computeTextLines(runs: TextRun[], config: TextLayoutConfig): TextLine[] {
  if (runs.length === 0) return [];

  const ctx = getDummyContext();
  const maxWidth = (config.width || 99999) - config.padding * 2;
  const wrapMode = config.wrap;
  const shouldWrap = wrapMode !== "none";
  const wrapAtWord = wrapMode !== "char";

  const fullText = config.plainText;
  const lines = fullText.split("\n");

  const resolvedStyles: Required<TextRunStyle>[] = [];
  for (const run of runs) {
    const s = resolveStyle(run.style);
    for (let i = 0; i < run.text.length; i++) {
      resolvedStyles.push(s);
    }
  }

  const result: TextLine[] = [];
  let globalCharIdx = 0;

  for (const rawLine of lines) {
    if (rawLine.length === 0) {
      const s =
        resolvedStyles[globalCharIdx] ?? resolvedStyles[globalCharIdx - 1] ?? resolveStyle({});
      result.push({
        parts: [{ text: "", style: s, width: 0 }],
        width: 0,
        height: s.fontSize * config.lineHeight,
      });
      globalCharIdx += 1;
      continue;
    }

    let cursor = 0;
    while (cursor < rawLine.length) {
      if (!shouldWrap) {
        const parts = buildParts(ctx, rawLine, globalCharIdx, runs);
        const lineW = parts.reduce((sum, p) => sum + p.width, 0);
        const lineH = Math.max(...parts.map((p) => p.style.fontSize)) * config.lineHeight;
        result.push({ parts, width: lineW, height: lineH });
        globalCharIdx += rawLine.length;
        cursor = rawLine.length;
        break;
      }

      const remaining = rawLine.slice(cursor);
      const remainingStart = globalCharIdx;

      const fullParts = buildParts(ctx, remaining, remainingStart, runs);
      const fullWidth = fullParts.reduce((sum, p) => sum + p.width, 0);

      if (fullWidth <= maxWidth) {
        const lineH = Math.max(...fullParts.map((p) => p.style.fontSize)) * config.lineHeight;
        result.push({ parts: fullParts, width: fullWidth, height: lineH });
        globalCharIdx += remaining.length;
        cursor = rawLine.length;
        break;
      }

      let low = 0;
      let high = remaining.length;
      let bestLen = 0;

      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        const substr = remaining.slice(0, mid);
        const subParts = buildParts(ctx, substr, remainingStart, runs);
        const subW = subParts.reduce((sum, p) => sum + p.width, 0);
        if (subW <= maxWidth) {
          low = mid;
          bestLen = mid;
        } else {
          high = mid - 1;
        }
      }

      if (bestLen === 0) bestLen = 1;

      if (wrapAtWord && bestLen < remaining.length) {
        const candidate = remaining.slice(0, bestLen);
        const nextChar = remaining[bestLen];
        const nextIsBreak = nextChar === " " || nextChar === "-";
        let wrapIdx = bestLen;
        if (!nextIsBreak) {
          const lastSpace = candidate.lastIndexOf(" ");
          const lastDash = candidate.lastIndexOf("-");
          const breakAt = Math.max(lastSpace, lastDash);
          if (breakAt > 0) wrapIdx = breakAt + 1;
        }
        bestLen = wrapIdx;
      }

      const lineText = remaining.slice(0, bestLen);
      const parts = buildParts(ctx, lineText, remainingStart, runs);
      const lineW = parts.reduce((sum, p) => sum + p.width, 0);
      const lineH = Math.max(...parts.map((p) => p.style.fontSize)) * config.lineHeight;
      result.push({ parts, width: lineW, height: lineH });

      cursor += bestLen;
      globalCharIdx += bestLen;

      if (cursor < rawLine.length && rawLine[cursor] === " ") {
        cursor++;
        globalCharIdx++;
      }
    }

    globalCharIdx++;
  }

  return result;
}
