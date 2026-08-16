import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type EditorState,
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  type LexicalEditor,
  type ParagraphNode,
} from "lexical";
import type {
  StrokeGradient,
  TextBackgroundPadding,
  TextGradient,
  TextRun,
  TextRunStyle,
  TextRunStyleUpdate,
} from "./block.types";
import { mergeAdjacentRuns } from "./text-run-utils";

// ── TextRun[] → Lexical EditorState ─────────────────────────────────

/**
 * Populate a Lexical editor with content from TextRun[].
 * Splits runs on '\n' into separate ParagraphNodes.
 */
export function runsToEditorState(editor: LexicalEditor, runs: TextRun[]): void {
  editor.update(() => {
    const root = $getRoot();
    root.clear();

    // Group runs into paragraphs on '\n' boundaries
    const paragraphs: TextRun[][] = [[]];
    for (const run of runs) {
      const segments = run.text.split("\n");
      segments.forEach((segment, i) => {
        if (i > 0) paragraphs.push([]);
        if (segment.length > 0) {
          paragraphs[paragraphs.length - 1].push({ text: segment, style: run.style });
        }
      });
    }

    for (const pRuns of paragraphs) {
      const paragraph = $createParagraphNode();
      for (const run of pRuns) {
        const textNode = $createTextNode(run.text);

        // Map TextRunStyle to Lexical format flags
        let format = 0;
        if (run.style.fontWeight === "bold" || run.style.fontWeight === "700") format |= IS_BOLD;
        if (run.style.fontStyle === "italic") format |= IS_ITALIC;
        if (run.style.textDecoration?.includes("underline")) format |= IS_UNDERLINE;
        if (run.style.textDecoration?.includes("line-through")) format |= IS_STRIKETHROUGH;
        if (format !== 0) textNode.setFormat(format);

        // Store remaining style props as inline CSS via node.setStyle()
        const cssStr = runStyleToCssString(run.style);
        if (cssStr) textNode.setStyle(cssStr);

        paragraph.append(textNode);
      }
      // Empty paragraphs still need an empty text node
      if (pRuns.length === 0) {
        paragraph.append($createTextNode(""));
      }
      root.append(paragraph);
    }
  });
}

// ── Lexical EditorState → TextRun[] ─────────────────────────────────

/**
 * Serialize a Lexical EditorState to TextRun[].
 * Each TextNode becomes a run; ParagraphNode boundaries become '\n'.
 */
export function editorStateToRuns(editorState: EditorState): TextRun[] {
  const runs: TextRun[] = [];

  editorState.read(() => {
    const root = $getRoot();
    const paragraphs = root.getChildren() as ParagraphNode[];

    paragraphs.forEach((paragraph, pIdx) => {
      const children = paragraph.getChildren();

      for (const node of children) {
        if ($isTextNode(node)) {
          const style = cssStringToRunStyle(node.getStyle());
          const format = node.getFormat();

          // Map Lexical format flags → TextRunStyle (always set explicit values)
          style.fontWeight = format & IS_BOLD ? "bold" : "normal";
          style.fontStyle = format & IS_ITALIC ? "italic" : "normal";

          // Combine underline/line-through into textDecoration
          const decorations: string[] = [];
          if (format & IS_UNDERLINE) decorations.push("underline");
          if (format & IS_STRIKETHROUGH) decorations.push("line-through");
          if (decorations.length > 0) style.textDecoration = decorations.join(" ");

          const text = node.getTextContent();
          if (text.length > 0) {
            runs.push({ text, style });
          }
        } else if (node.getType() === "linebreak") {
          const lastStyle = runs.length > 0 ? { ...runs[runs.length - 1].style } : {};
          runs.push({ text: "\n", style: lastStyle });
        }
      }

      // '\n' between paragraphs (not after the last one)
      if (pIdx < paragraphs.length - 1) {
        const lastStyle = runs.length > 0 ? { ...runs[runs.length - 1].style } : {};
        runs.push({ text: "\n", style: lastStyle });
      }
    });
  });

  return mergeAdjacentRuns(runs);
}

// ── Selection → character offsets ───────────────────────────────────

/**
 * Read the current Lexical selection as character offsets relative to full text.
 * Returns null if no range selection.
 */
export function getSelectionOffsets(editorState: EditorState): { from: number; to: number } | null {
  let result: { from: number; to: number } | null = null;

  editorState.read(() => {
    const sel = $getSelection();
    if (!$isRangeSelection(sel)) return;

    const root = $getRoot();

    const anchor = sel.anchor;
    const focus = sel.focus;

    const anchorOffset = getGlobalOffset(root, anchor.key, anchor.offset);
    const focusOffset = getGlobalOffset(root, focus.key, focus.offset);

    if (anchorOffset === null || focusOffset === null) return;

    result = {
      from: Math.min(anchorOffset, focusOffset),
      to: Math.max(anchorOffset, focusOffset),
    };
  });

  return result;
}

/**
 * Restore a Lexical selection from global character offsets.
 * Must be called inside an editor.update() callback.
 */
export function $restoreSelectionFromOffsets(from: number, to: number): void {
  const root = $getRoot();
  const paragraphs = root.getChildren() as ParagraphNode[];

  const resolvePoint = (globalOffset: number): { key: string; offset: number } | null => {
    let remaining = globalOffset;
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      if (pIdx > 0) {
        if (remaining === 0) {
          const children = paragraphs[pIdx].getChildren();
          for (const child of children) {
            if ($isTextNode(child)) return { key: child.getKey(), offset: 0 };
          }
        }
        remaining -= 1;
      }
      const children = paragraphs[pIdx].getChildren();
      for (const child of children) {
        if ($isTextNode(child)) {
          const len = child.getTextContentSize();
          if (remaining <= len) {
            return { key: child.getKey(), offset: remaining };
          }
          remaining -= len;
        }
      }
    }
    // Fallback: place at the very end
    for (let pIdx = paragraphs.length - 1; pIdx >= 0; pIdx--) {
      const children = paragraphs[pIdx].getChildren();
      for (let cIdx = children.length - 1; cIdx >= 0; cIdx--) {
        const child = children[cIdx];
        if ($isTextNode(child)) {
          return { key: child.getKey(), offset: child.getTextContentSize() };
        }
      }
    }
    return null;
  };

  const anchorPoint = resolvePoint(from);
  const focusPoint = resolvePoint(to);

  if (!anchorPoint || !focusPoint) return;

  const sel = $createRangeSelection();
  sel.anchor.set(anchorPoint.key, anchorPoint.offset, "text");
  sel.focus.set(focusPoint.key, focusPoint.offset, "text");
  $setSelection(sel);
}

/**
 * Compute global character offset for a node key + local offset.
 */
function getGlobalOffset(
  root: ReturnType<typeof $getRoot>,
  nodeKey: string,
  localOffset: number,
): number | null {
  const paragraphs = root.getChildren() as ParagraphNode[];
  let globalOffset = 0;

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    if (pIdx > 0) globalOffset += 1;

    const paragraph = paragraphs[pIdx];
    const children = paragraph.getChildren();

    // Element point ON the paragraph (e.g. caret after a trailing line break):
    // offset is a child index, so sum the sizes of the children before it.
    if (paragraph.getKey() === nodeKey) {
      let off = globalOffset;
      for (let i = 0; i < localOffset && i < children.length; i++) {
        off += children[i].getTextContentSize();
      }
      return off;
    }

    for (const child of children) {
      if (child.getKey() === nodeKey) {
        return globalOffset + localOffset;
      }
      globalOffset += child.getTextContentSize();
    }
  }

  return null;
}

// ── CSS ↔ TextRunStyle helpers ──────────────────────────────────────

/** Convert TextRunStyle to a CSS string for Lexical's node.setStyle(). */
export function runStyleToCssString(style: TextRunStyle): string {
  const parts: string[] = [];
  if (style.fontSize != null) parts.push(`font-size: ${style.fontSize}px`);
  if (style.fontFamily != null) parts.push(`font-family: ${style.fontFamily}`);
  if (style.fill != null) parts.push(`color: ${style.fill}`);
  if (style.letterSpacing != null) parts.push(`letter-spacing: ${style.letterSpacing}px`);
  if (style.backgroundColor != null && style.backgroundColor !== "") {
    parts.push(`background-color: ${style.backgroundColor}`);
  }
  if (style.textTransform != null) parts.push(`text-transform: ${style.textTransform}`);
  if (style.textShadowColor != null && style.textShadowColor !== "") {
    parts.push(`--text-shadow-color: ${style.textShadowColor}`);
  }
  if (style.textShadowBlur != null) parts.push(`--text-shadow-blur: ${style.textShadowBlur}`);
  if (style.textShadowOffsetX != null)
    parts.push(`--text-shadow-offset-x: ${style.textShadowOffsetX}`);
  if (style.textShadowOffsetY != null)
    parts.push(`--text-shadow-offset-y: ${style.textShadowOffsetY}`);
  if (style.textStrokeColor != null && style.textStrokeColor !== "") {
    parts.push(`--text-stroke-color: ${style.textStrokeColor}`);
  }
  if (style.textStrokeWidth != null) parts.push(`--text-stroke-width: ${style.textStrokeWidth}`);
  if (style.textStrokeGradient != null) {
    parts.push(
      `--text-stroke-gradient: ${encodeURIComponent(JSON.stringify(style.textStrokeGradient))}`,
    );
  }
  if (style.backgroundOpacity != null)
    parts.push(`--text-background-opacity: ${style.backgroundOpacity}`);
  if (style.backgroundCornerRadius != null)
    parts.push(`--text-background-corner-radius: ${style.backgroundCornerRadius}`);
  if (style.backgroundPadding != null) {
    // Same URI-encoded JSON approach as fillGradient — keeps per-side padding lossless.
    parts.push(
      `--text-background-padding: ${encodeURIComponent(JSON.stringify(style.backgroundPadding))}`,
    );
  }
  if (style.fillGradient != null) {
    // JSON is URI-encoded so the CSS var value stays free of ';', ':', '{', '}'
    // and quotes — keeps the flat contenteditable overlay's inline style valid
    // AND round-trips the gradient losslessly so editing never drops it.
    parts.push(`--text-fill-gradient: ${encodeURIComponent(JSON.stringify(style.fillGradient))}`);
  }
  return parts.join("; ");
}

/** Parse a CSS string from node.getStyle() back to TextRunStyle. */
export function cssStringToRunStyle(cssStr: string): TextRunStyle {
  const style: TextRunStyle = {};
  if (!cssStr) return style;

  for (const decl of cssStr.split(";")) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim();
    const val = decl.slice(colonIdx + 1).trim();

    switch (prop) {
      case "font-size":
        style.fontSize = parseFloat(val);
        break;
      case "font-family":
        style.fontFamily = val;
        break;
      case "color":
        style.fill = val;
        break;
      case "letter-spacing":
        style.letterSpacing = parseFloat(val);
        break;
      case "background-color":
        style.backgroundColor = val;
        break;
      case "text-transform":
        if (val === "uppercase" || val === "lowercase" || val === "capitalize" || val === "none") {
          style.textTransform = val;
        }
        break;
      case "--text-shadow-color":
        style.textShadowColor = val;
        break;
      case "--text-shadow-blur":
        style.textShadowBlur = parseFloat(val);
        break;
      case "--text-shadow-offset-x":
        style.textShadowOffsetX = parseFloat(val);
        break;
      case "--text-shadow-offset-y":
        style.textShadowOffsetY = parseFloat(val);
        break;
      case "--text-stroke-color":
        style.textStrokeColor = val;
        break;
      case "--text-background-opacity":
        if (Number.isFinite(Number(val))) style.backgroundOpacity = Number(val);
        break;
      case "--text-background-corner-radius":
        if (Number.isFinite(Number(val))) style.backgroundCornerRadius = Number(val);
        break;
      case "--text-background-padding":
        style.backgroundPadding = parsePaddingValue(val);
        break;
      case "--text-stroke-width":
        style.textStrokeWidth = parseFloat(val);
        break;
      case "--text-stroke-gradient":
        style.textStrokeGradient = parseStrokeGradientValue(val);
        break;
      case "--text-fill-gradient":
        style.fillGradient = parseGradientValue(val);
        break;
    }
  }

  return style;
}

/**
 * Convert a partial TextRunStyle update to a CSS patch object for $patchStyleText.
 * Only includes CSS-stored properties (not format-flag ones like fontWeight/fontStyle/textDecoration).
 * A `null` value maps to a `null` patch entry, which removes the declaration.
 */
export function textRunStyleToCssPatch(update: TextRunStyleUpdate): Record<string, string | null> {
  const patch: Record<string, string | null> = {};
  if (update.fill !== undefined) patch.color = update.fill;
  if (update.fontSize !== undefined)
    patch["font-size"] = update.fontSize != null ? `${update.fontSize}px` : null;
  if (update.fontFamily !== undefined) patch["font-family"] = update.fontFamily ?? null;
  if (update.letterSpacing !== undefined)
    patch["letter-spacing"] = update.letterSpacing != null ? `${update.letterSpacing}px` : null;
  if (update.backgroundColor !== undefined)
    patch["background-color"] = update.backgroundColor || null;
  if (update.textTransform !== undefined) patch["text-transform"] = update.textTransform ?? null;
  if (update.textShadowColor !== undefined)
    patch["--text-shadow-color"] = update.textShadowColor || null;
  if (update.textShadowBlur !== undefined)
    patch["--text-shadow-blur"] = update.textShadowBlur != null ? `${update.textShadowBlur}` : null;
  if (update.textShadowOffsetX !== undefined)
    patch["--text-shadow-offset-x"] =
      update.textShadowOffsetX != null ? `${update.textShadowOffsetX}` : null;
  if (update.textShadowOffsetY !== undefined)
    patch["--text-shadow-offset-y"] =
      update.textShadowOffsetY != null ? `${update.textShadowOffsetY}` : null;
  if (update.textStrokeColor !== undefined)
    patch["--text-stroke-color"] = update.textStrokeColor || null;
  if (update.textStrokeWidth !== undefined)
    patch["--text-stroke-width"] =
      update.textStrokeWidth != null ? `${update.textStrokeWidth}` : null;
  if (update.textStrokeGradient !== undefined)
    patch["--text-stroke-gradient"] =
      update.textStrokeGradient != null
        ? encodeURIComponent(JSON.stringify(update.textStrokeGradient))
        : null;
  if (update.backgroundOpacity !== undefined)
    patch["--text-background-opacity"] =
      update.backgroundOpacity != null ? `${update.backgroundOpacity}` : null;
  if (update.backgroundCornerRadius !== undefined)
    patch["--text-background-corner-radius"] =
      update.backgroundCornerRadius != null ? `${update.backgroundCornerRadius}` : null;
  if (update.backgroundPadding !== undefined)
    patch["--text-background-padding"] =
      update.backgroundPadding != null
        ? encodeURIComponent(JSON.stringify(update.backgroundPadding))
        : null;
  if (update.fillGradient !== undefined)
    patch["--text-fill-gradient"] =
      update.fillGradient != null ? encodeURIComponent(JSON.stringify(update.fillGradient)) : null;
  return patch;
}

/** Decode a URI-encoded JSON gradient from a CSS var; undefined when invalid. */
function parseGradientValue(val: string): TextGradient | undefined {
  try {
    const parsed = JSON.parse(decodeURIComponent(val));
    if (parsed && Array.isArray(parsed.stops) && typeof parsed.type === "string") {
      return parsed as TextGradient;
    }
  } catch {
    // Malformed value — treat as no gradient rather than throwing during parse.
  }
  return undefined;
}

function parseStrokeGradientValue(val: string): StrokeGradient | undefined {
  const gradient = parseGradientValue(val);
  if (gradient?.type !== "linear") return undefined;
  return { type: "linear", angle: gradient.angle ?? 0, stops: gradient.stops };
}

/** Decode a URI-encoded JSON per-side padding override from a CSS var; undefined when invalid. */
function parsePaddingValue(val: string): Partial<TextBackgroundPadding> | undefined {
  try {
    const parsed = JSON.parse(decodeURIComponent(val));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const padding: Partial<TextBackgroundPadding> = {};
      for (const side of ["top", "right", "bottom", "left"] as const) {
        if (parsed[side] !== undefined) {
          if (typeof parsed[side] !== "number" || !Number.isFinite(parsed[side])) return undefined;
          padding[side] = parsed[side];
        }
      }
      return padding;
    }
  } catch {
    // Malformed value — treat as no override rather than throwing during parse.
  }
  return undefined;
}
