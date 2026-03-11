import type { TextRun, TextRunStyle } from '@creative-editor/engine';

/**
 * DOM ↔ TextRun[] conversion utilities for the contentEditable overlay.
 * IMP-5: Bidirectional CSS ↔ canvas property mapping.
 */

/** Convert a TextRunStyle to inline CSS properties. */
export function runStyleToCss(style: TextRunStyle): Record<string, string> {
  const css: Record<string, string> = {};
  if (style.fontSize != null) css.fontSize = `${style.fontSize}px`;
  if (style.fontFamily != null) css.fontFamily = style.fontFamily;
  if (style.fontWeight != null) css.fontWeight = style.fontWeight;
  if (style.fontStyle != null) css.fontStyle = style.fontStyle;
  if (style.fill != null) css.color = style.fill;
  if (style.letterSpacing != null && style.letterSpacing !== 0) {
    css.letterSpacing = `${style.letterSpacing}px`;
  }
  if (style.textDecoration != null && style.textDecoration !== '') {
    css.textDecoration = style.textDecoration;
  }
  return css;
}

/** Convert inline CSS (from computed/style) back to a TextRunStyle. */
export function cssToRunStyle(el: HTMLElement): Partial<TextRunStyle> {
  const computed = window.getComputedStyle(el);
  const style: Partial<TextRunStyle> = {};

  const fontSize = parseFloat(computed.fontSize);
  if (!isNaN(fontSize)) style.fontSize = fontSize;

  if (computed.fontFamily) style.fontFamily = computed.fontFamily.replace(/^["']|["']$/g, '');
  if (computed.fontWeight) {
    style.fontWeight = computed.fontWeight === '700' ? 'bold' : computed.fontWeight === '400' ? 'normal' : computed.fontWeight;
  }
  if (computed.fontStyle && computed.fontStyle !== 'normal') style.fontStyle = computed.fontStyle;
  if (computed.color) style.fill = rgbToHex(computed.color);

  const ls = parseFloat(computed.letterSpacing);
  if (!isNaN(ls) && ls !== 0) style.letterSpacing = ls;

  if (computed.textDecorationLine && computed.textDecorationLine !== 'none') {
    style.textDecoration = computed.textDecorationLine;
  }

  return style;
}

/** Convert TextRun[] to styled HTML string for contentEditable. */
export function runsToHtml(runs: TextRun[]): string {
  return runs.map((run) => {
    const css = runStyleToCss(run.style);
    const styleStr = Object.entries(css)
      .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
      .join('; ');

    // Escape HTML entities to prevent XSS (IMP-4)
    const escaped = escapeHtml(run.text);
    // Convert newlines to <br> tags
    const withBreaks = escaped.replace(/\n/g, '<br>');

    return `<span style="${styleStr}">${withBreaks}</span>`;
  }).join('');
}

/** Recursively flatten a contentEditable DOM element to TextRun[]. IMP-8: merge adjacent same-style. */
export function htmlToRuns(element: HTMLElement): TextRun[] {
  const runs: TextRun[] = [];
  flattenNode(element, runs);
  return mergeAdjacentStyledRuns(runs);
}

function flattenNode(node: Node, runs: TextRun[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (text.length === 0) continue;

      // Inherit style from the closest styled parent element
      const parentEl = child.parentElement;
      const style = parentEl ? cssToRunStyle(parentEl) : {};
      runs.push({ text, style });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      if (el.tagName === 'BR') {
        runs.push({ text: '\n', style: {} });
      } else if (el.tagName === 'MARK') {
        // IMP-3: <mark> is used for selection persistence; flatten its children
        flattenNode(el, runs);
      } else {
        flattenNode(el, runs);
      }
    }
  }
}

/** IMP-8: Merge adjacent runs with identical styles. */
function mergeAdjacentStyledRuns(runs: TextRun[]): TextRun[] {
  if (runs.length === 0) return [];
  const result: TextRun[] = [{ text: runs[0].text, style: { ...runs[0].style } }];

  for (let i = 1; i < runs.length; i++) {
    const prev = result[result.length - 1];
    if (stylesMatch(prev.style, runs[i].style)) {
      prev.text += runs[i].text;
    } else {
      result.push({ text: runs[i].text, style: { ...runs[i].style } });
    }
  }
  return result.filter((r) => r.text.length > 0);
}

function stylesMatch(a: TextRunStyle, b: TextRunStyle): boolean {
  return (
    (a.fontSize ?? undefined) === (b.fontSize ?? undefined) &&
    (a.fontFamily ?? undefined) === (b.fontFamily ?? undefined) &&
    (a.fontWeight ?? undefined) === (b.fontWeight ?? undefined) &&
    (a.fontStyle ?? undefined) === (b.fontStyle ?? undefined) &&
    (a.fill ?? undefined) === (b.fill ?? undefined) &&
    (a.letterSpacing ?? undefined) === (b.letterSpacing ?? undefined) &&
    (a.textDecoration ?? undefined) === (b.textDecoration ?? undefined)
  );
}

/**
 * Get the current selection as character indices relative to the contentEditable root.
 * Returns null if no selection or selection is outside the element.
 */
export function getSelectionRange(element: HTMLElement): { from: number; to: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
    return null;
  }

  const from = getCharOffset(element, range.startContainer, range.startOffset);
  const to = getCharOffset(element, range.endContainer, range.endOffset);
  if (from === null || to === null) return null;

  return { from: Math.min(from, to), to: Math.max(from, to) };
}

/** Set the selection within a contentEditable element by character offsets. */
export function setSelectionRange(element: HTMLElement, from: number, to: number): void {
  const sel = window.getSelection();
  if (!sel) return;

  const startPos = findNodeAtOffset(element, from);
  const endPos = findNodeAtOffset(element, to);
  if (!startPos || !endPos) return;

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  sel.removeAllRanges();
  sel.addRange(range);
}

// ── Helpers ──────────────────────────────────────────

function getCharOffset(root: HTMLElement, node: Node, offset: number): number | null {
  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current === node) return count + offset;
    count += (current.textContent?.length ?? 0);
    current = walker.nextNode();
  }
  // Check if node is an element (e.g., for <br> positions)
  if (node.nodeType === Node.ELEMENT_NODE) {
    let childCount = 0;
    const childWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let w = childWalker.nextNode();
    let idx = 0;
    const children = Array.from(node.childNodes);
    while (w && idx < offset) {
      if (children.includes(w as ChildNode)) idx++;
      childCount += (w.textContent?.length ?? 0);
      w = childWalker.nextNode();
    }
    return childCount;
  }
  return null;
}

function findNodeAtOffset(root: HTMLElement, targetOffset: number): { node: Node; offset: number } | null {
  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const len = current.textContent?.length ?? 0;
    if (count + len >= targetOffset) {
      return { node: current, offset: targetOffset - count };
    }
    count += len;
    current = walker.nextNode();
  }
  // If offset is at the very end
  if (count === targetOffset && root.lastChild) {
    const last = root.lastChild;
    if (last.nodeType === Node.TEXT_NODE) {
      return { node: last, offset: last.textContent?.length ?? 0 };
    }
  }
  return null;
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rgbToHex(color: string): string {
  // Handle rgb(r, g, b) format
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  // Handle rgba(r, g, b, a) format
  const matchA = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
  if (matchA) {
    const r = parseInt(matchA[1], 10);
    const g = parseInt(matchA[2], 10);
    const b = parseInt(matchA[3], 10);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  return color; // Already hex or named
}
