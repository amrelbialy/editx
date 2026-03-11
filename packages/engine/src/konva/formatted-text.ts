import Konva from 'konva';
import type { TextRun, TextRunStyle } from '../block/block.types';

/** Default style values used when a run's style property is undefined. */
const DEFAULT_STYLE: Required<TextRunStyle> = {
  fontSize: 16,
  fontFamily: 'Arial',
  fontWeight: 'normal',
  fontStyle: 'normal',
  fill: '#000000',
  letterSpacing: 0,
  textDecoration: '',
};

interface TextLine {
  parts: LinePart[];
  width: number;
  height: number;
}

interface LinePart {
  text: string;
  style: Required<TextRunStyle>;
  width: number;
}

let _dummyCtx: CanvasRenderingContext2D | null = null;
function getDummyContext(): CanvasRenderingContext2D {
  if (!_dummyCtx) {
    const c = document.createElement('canvas');
    _dummyCtx = c.getContext('2d')!;
  }
  return _dummyCtx;
}

function normalizeFontFamily(fontFamily: string): string {
  return fontFamily
    .split(',')
    .map((f) => {
      f = f.trim();
      if (f.includes(' ') && !f.includes('"') && !f.includes("'")) {
        f = `"${f}"`;
      }
      return f;
    })
    .join(', ');
}

function formatFont(style: Required<TextRunStyle>): string {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${normalizeFontFamily(style.fontFamily)}`;
}

function resolveStyle(style: TextRunStyle): Required<TextRunStyle> {
  return {
    fontSize: style.fontSize ?? DEFAULT_STYLE.fontSize,
    fontFamily: style.fontFamily ?? DEFAULT_STYLE.fontFamily,
    fontWeight: style.fontWeight ?? DEFAULT_STYLE.fontWeight,
    fontStyle: style.fontStyle ?? DEFAULT_STYLE.fontStyle,
    fill: style.fill ?? DEFAULT_STYLE.fill,
    letterSpacing: style.letterSpacing ?? DEFAULT_STYLE.letterSpacing,
    textDecoration: style.textDecoration ?? DEFAULT_STYLE.textDecoration,
  };
}

export interface FormattedTextConfig extends Konva.ShapeConfig {
  textRuns?: TextRun[];
  align?: string;
  verticalAlign?: string;
  lineHeight?: number;
  padding?: number;
  wrap?: string;
  width?: number;
  height?: number;
}

/**
 * Custom Konva.Shape that renders multi-run styled text.
 * Each TextRun can have its own fontSize, fontFamily, fontWeight, fontStyle, fill,
 * letterSpacing, and textDecoration.
 *
 * Adapted from filerobot's FormattedTextFIE, simplified:
 * - No baselineShift/cap-height trimming (DEP-2)
 * - Binary search line breaking (IMP-1)
 * - Proportional text decoration (IMP-7)
 * - Cached plainText (IMP-10)
 */
export class FormattedText extends Konva.Shape {
  private _textLines: TextLine[] = [];
  private _plainTextCache: string | null = null;

  constructor(config?: FormattedTextConfig) {
    super(config);

    const watchAttrs = ['textRuns', 'align', 'verticalAlign', 'lineHeight', 'padding', 'wrap', 'width', 'height'];
    watchAttrs.forEach((attr) => {
      this.on(`${attr}Change.konva`, () => {
        this._textLines = [];
        this._plainTextCache = null;
      });
    });
  }

  // ── Attribute accessors ─────────────────────────────

  textRuns(): TextRun[];
  textRuns(val: TextRun[]): this;
  textRuns(val?: TextRun[]): TextRun[] | this {
    if (val === undefined) return this.getAttr('textRuns') ?? [];
    this.setAttr('textRuns', val);
    return this;
  }

  align(): string;
  align(val: string): this;
  align(val?: string): string | this {
    if (val === undefined) return this.getAttr('align') ?? 'left';
    this.setAttr('align', val);
    return this;
  }

  verticalAlign(): string;
  verticalAlign(val: string): this;
  verticalAlign(val?: string): string | this {
    if (val === undefined) return this.getAttr('verticalAlign') ?? 'top';
    this.setAttr('verticalAlign', val);
    return this;
  }

  lineHeight(): number;
  lineHeight(val: number): this;
  lineHeight(val?: number): number | this {
    if (val === undefined) return this.getAttr('lineHeight') ?? 1.2;
    this.setAttr('lineHeight', val);
    return this;
  }

  padding(): number;
  padding(val: number): this;
  padding(val?: number): number | this {
    if (val === undefined) return this.getAttr('padding') ?? 0;
    this.setAttr('padding', val);
    return this;
  }

  wrap(): string;
  wrap(val: string): this;
  wrap(val?: string): string | this {
    if (val === undefined) return this.getAttr('wrap') ?? 'word';
    this.setAttr('wrap', val);
    return this;
  }

  // ── IMP-10: Cached plain text ─────────────────────

  getPlainText(): string {
    if (this._plainTextCache === null) {
      this._plainTextCache = this.textRuns().map((r) => r.text).join('');
    }
    return this._plainTextCache;
  }

  /** Maps a global character index to { runIndex, offsetInRun }. */
  findRunAtIndex(charIndex: number): { runIndex: number; offsetInRun: number } | null {
    const runs = this.textRuns();
    let offset = 0;
    for (let i = 0; i < runs.length; i++) {
      const end = offset + runs[i].text.length;
      if (charIndex < end) {
        return { runIndex: i, offsetInRun: charIndex - offset };
      }
      offset = end;
    }
    return null;
  }

  // ── Text layout computation ────────────────────────

  private _measureText(ctx: CanvasRenderingContext2D, text: string, style: Required<TextRunStyle>): number {
    ctx.font = formatFont(style);
    if (style.letterSpacing > 0 && text.length > 1) {
      // With letter spacing, measure char-by-char
      let w = 0;
      for (let i = 0; i < text.length; i++) {
        w += ctx.measureText(text[i]).width + (i < text.length - 1 ? style.letterSpacing : 0);
      }
      return w;
    }
    return ctx.measureText(text).width;
  }

  private _computeTextLines(): TextLine[] {
    if (this._textLines.length > 0) return this._textLines;

    const runs = this.textRuns();
    if (runs.length === 0) {
      this._textLines = [];
      return this._textLines;
    }

    const ctx = getDummyContext();
    const pad = this.padding();
    const maxWidth = (this.width() || 99999) - pad * 2;
    const wrapMode = this.wrap();
    const shouldWrap = wrapMode !== 'none';
    const wrapAtWord = wrapMode !== 'char';

    // Flatten runs into a single text + style mapping per character
    const fullText = this.getPlainText();
    const lines = fullText.split('\n');

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
        // Empty line — still takes up height based on surrounding style
        const s = resolvedStyles[globalCharIdx] ?? resolvedStyles[globalCharIdx - 1] ?? resolveStyle({});
        result.push({
          parts: [{ text: '', style: s, width: 0 }],
          width: 0,
          height: s.fontSize * this.lineHeight(),
        });
        globalCharIdx += 1; // skip newline
        continue;
      }

      let cursor = 0;
      while (cursor < rawLine.length) {
        if (!shouldWrap) {
          // No wrapping — entire line as one
          const parts = this._buildParts(ctx, rawLine, globalCharIdx);
          const lineW = parts.reduce((sum, p) => sum + p.width, 0);
          const lineH = Math.max(...parts.map((p) => p.style.fontSize)) * this.lineHeight();
          result.push({ parts, width: lineW, height: lineH });
          globalCharIdx += rawLine.length;
          cursor = rawLine.length;
          break;
        }

        // Try to fit as much text as possible using binary search (IMP-1)
        const remaining = rawLine.slice(cursor);
        const remainingStart = globalCharIdx + cursor;

        // Measure if the rest fits
        const fullParts = this._buildParts(ctx, remaining, remainingStart);
        const fullWidth = fullParts.reduce((sum, p) => sum + p.width, 0);

        if (fullWidth <= maxWidth) {
          // The rest of the line fits
          const lineH = Math.max(...fullParts.map((p) => p.style.fontSize)) * this.lineHeight();
          result.push({ parts: fullParts, width: fullWidth, height: lineH });
          globalCharIdx += remaining.length;
          cursor = rawLine.length;
          break;
        }

        // Binary search for the longest fitting substring (IMP-1)
        let low = 0;
        let high = remaining.length;
        let bestLen = 0;

        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          const substr = remaining.slice(0, mid);
          const subParts = this._buildParts(ctx, substr, remainingStart);
          const subW = subParts.reduce((sum, p) => sum + p.width, 0);

          if (subW <= maxWidth) {
            low = mid;
            bestLen = mid;
          } else {
            high = mid - 1;
          }
        }

        if (bestLen === 0) bestLen = 1; // At least 1 character per line

        // Word-wrap: look backwards for a space or dash
        if (wrapAtWord && bestLen < remaining.length) {
          const candidate = remaining.slice(0, bestLen);
          const nextChar = remaining[bestLen];
          const nextIsBreak = nextChar === ' ' || nextChar === '-';
          let wrapIdx = bestLen;
          if (!nextIsBreak) {
            const lastSpace = candidate.lastIndexOf(' ');
            const lastDash = candidate.lastIndexOf('-');
            const breakAt = Math.max(lastSpace, lastDash);
            if (breakAt > 0) {
              wrapIdx = breakAt + 1;
            }
          }
          bestLen = wrapIdx;
        }

        const lineText = remaining.slice(0, bestLen);
        const parts = this._buildParts(ctx, lineText, remainingStart);
        const lineW = parts.reduce((sum, p) => sum + p.width, 0);
        const lineH = Math.max(...parts.map((p) => p.style.fontSize)) * this.lineHeight();
        result.push({ parts, width: lineW, height: lineH });

        cursor += bestLen;
        globalCharIdx += bestLen;

        // Skip a space at the break point (don't start next line with a space)
        if (cursor < rawLine.length && rawLine[cursor] === ' ') {
          cursor++;
          globalCharIdx++;
        }
      }

      globalCharIdx++; // skip newline character
    }

    this._textLines = result;
    return result;
  }

  /** Build LinePart[] for a substring, using per-character resolved styles. */
  private _buildParts(
    ctx: CanvasRenderingContext2D,
    text: string,
    globalStartIdx: number,
  ): LinePart[] {
    const runs = this.textRuns();

    // Re-resolve styles — build style spans for this substring
    const parts: LinePart[] = [];
    let offset = 0;

    // Find which run contains globalStartIdx
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

    // Walk through characters, grouping by style
    let currentStyle = resolveStyle(runs[runIdx]?.style ?? {});
    let currentText = '';
    let charGlobal = globalStartIdx;

    for (let i = 0; i < text.length; i++) {
      // Determine which run this character belongs to
      let rcs = 0;
      let ri = 0;
      for (let r = 0; r < runs.length; r++) {
        const rEnd = rcs + runs[r].text.length;
        if (charGlobal < rEnd) {
          ri = r;
          break;
        }
        rcs = rEnd;
      }

      const charStyle = resolveStyle(runs[ri]?.style ?? {});
      const sameStyle =
        charStyle.fontSize === currentStyle.fontSize &&
        charStyle.fontFamily === currentStyle.fontFamily &&
        charStyle.fontWeight === currentStyle.fontWeight &&
        charStyle.fontStyle === currentStyle.fontStyle &&
        charStyle.fill === currentStyle.fill &&
        charStyle.letterSpacing === currentStyle.letterSpacing &&
        charStyle.textDecoration === currentStyle.textDecoration;

      if (!sameStyle && currentText.length > 0) {
        const w = this._measureText(ctx, currentText, currentStyle);
        parts.push({ text: currentText, style: currentStyle, width: w });
        currentText = '';
        currentStyle = charStyle;
      } else if (!sameStyle) {
        currentStyle = charStyle;
      }

      currentText += text[i];
      charGlobal++;
    }

    if (currentText.length > 0) {
      const w = this._measureText(ctx, currentText, currentStyle);
      parts.push({ text: currentText, style: currentStyle, width: w });
    }

    return parts;
  }

  // ── Rendering ──────────────────────────────────────

  _sceneFunc(context: Konva.Context): void {
    const ctx = context._context;
    const textLines = this._computeTextLines();
    if (textLines.length === 0) return;

    const pad = this.padding();
    const totalWidth = (this.width() || 99999) - pad * 2;
    const totalHeight = (this.height() || 0) - pad * 2;
    const align = this.align();
    const vAlign = this.verticalAlign();

    // Compute total text height for vertical alignment
    const textHeight = textLines.reduce((sum, l) => sum + l.height, 0);

    let yOffset = pad;
    if (vAlign === 'middle' && totalHeight > 0) {
      yOffset = pad + (totalHeight - textHeight) / 2;
    } else if (vAlign === 'bottom' && totalHeight > 0) {
      yOffset = pad + totalHeight - textHeight;
    }

    ctx.textBaseline = 'top';

    for (const line of textLines) {
      let xOffset = pad;
      if (align === 'center') {
        xOffset = pad + (totalWidth - line.width) / 2;
      } else if (align === 'right') {
        xOffset = pad + totalWidth - line.width;
      }

      // Ascent offset: position text relative to line top
      const maxFontSize = Math.max(...line.parts.map((p) => p.style.fontSize));

      for (const part of line.parts) {
        ctx.font = formatFont(part.style);
        ctx.fillStyle = part.style.fill;

        // Vertical alignment within line for mixed font sizes
        const partYOffset = yOffset + (maxFontSize - part.style.fontSize) * 0.8;

        if (part.style.letterSpacing > 0 && part.text.length > 0) {
          // Character-by-character drawing for letter spacing
          let charX = xOffset;
          for (let i = 0; i < part.text.length; i++) {
            ctx.fillText(part.text[i], charX, partYOffset);
            charX += ctx.measureText(part.text[i]).width + part.style.letterSpacing;
          }
        } else {
          ctx.fillText(part.text, xOffset, partYOffset);
        }

        // IMP-7: Proportional text decoration
        if (part.style.textDecoration) {
          const decoLineWidth = Math.max(1, part.style.fontSize / 15);
          ctx.strokeStyle = part.style.fill;
          ctx.lineWidth = decoLineWidth;
          ctx.beginPath();

          if (part.style.textDecoration.includes('underline')) {
            const underY = partYOffset + part.style.fontSize;
            ctx.moveTo(xOffset, underY);
            ctx.lineTo(xOffset + part.width, underY);
          }
          if (part.style.textDecoration.includes('line-through')) {
            const strikeY = partYOffset + part.style.fontSize / 2;
            ctx.moveTo(xOffset, strikeY);
            ctx.lineTo(xOffset + part.width, strikeY);
          }
          ctx.stroke();
        }

        xOffset += part.width;
      }

      yOffset += line.height;
    }
  }

  _hitFunc(context: Konva.Context): void {
    const ctx = context._context;
    const w = this.width() || 0;
    const h = this.height() || this._getComputedHeight();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.closePath();
    context.fillStrokeShape(this);
  }

  /** Returns the computed height based on text layout. */
  private _getComputedHeight(): number {
    const lines = this._computeTextLines();
    const pad = this.padding();
    return lines.reduce((sum, l) => sum + l.height, 0) + pad * 2;
  }

  getClassName(): string {
    return 'FormattedText';
  }
}
