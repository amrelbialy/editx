# Feature 7: Text Annotations â€” FormattedText with Character-Level Editing

## TL;DR

Add rich text annotation support with **character-level styling** â€” text content is stored as an array of styled runs (`TextRun[]`), rendered via a custom `FormattedText` Konva shape (not native `Konva.Text`), and edited inline via a contentEditable HTML overlay. The Block API exposes range-based methods matching img.ly CE.SDK's text API (`setTextColor(id, from, to)`, `toggleBoldFont(id, from, to)`, etc.). Users select a character range and style just that portion â€” bold a word, color a sentence, mix font sizes.

## Reference Analysis

### img.ly CE.SDK â€” Block Text API (Range-Based)

Dedicated text section on BlockAPI with per-character-range editing:

- `replaceText(blockId, from, to, text)` â€” replace a range of text
- `removeText(blockId, from, to)` â€” remove a range
- `setTextColor(blockId, from, to, color)` â€” color per character range
- `setTextFontWeight(blockId, from, to, weight)` â€” bold per range
- `setTextFontSize(blockId, from, to, size)` â€” size per range
- `setTextFontStyle(blockId, from, to, style)` â€” italic per range
- `setTextCase(blockId, from, to, case)` â€” uppercase/lowercase per range
- `toggleBoldFont(blockId, from, to)` / `toggleItalicFont(blockId, from, to)`
- `setFont(blockId, fontUri)` / `setTypeface(blockId, from, to, typeface)`
- `getTextCursorRange(blockId)` / `setTextCursorRange(blockId, from, to)`
- Range-based getters: `getTextColors()`, `getTextFontWeights()`, `getTextFontSizes()`, etc.

### Filerobot â€” FormattedText Rich Text Model

- **Data model:** Text stored as `TextPart[]` â€” array of styled runs:
  ```
  { textContent: "Hello", style: { fontSize: 16, fill: "#000", fontWeight: "bold" }, startIndex: 0, endIndex: 5 }
  ```
- **Allowed per-run style props:** `fontSize`, `fill`, `fontWeight`, `fontStyle`, `fontFamily`, `baselineShift`, `letterSpacing`
- **Rendering:** Custom `FormattedText extends Konva.Shape` (~950 lines) â€” manual canvas text layout with per-run font measurement, line wrapping, alignment, letter spacing
  - `measurePart(part)` â€” measures text width with canvas API per run
  - `computeTextParts()` â€” splits into lines, wraps, computes bounding boxes
  - `_sceneFunc()` â€” draws each run with its own font/color/style
  - Supports horizontal alignment (left/center/right) and vertical alignment (top/middle/bottom)
- **Inline editing:** Double-click â†’ hide Konva shape â†’ show `contentEditable` div overlay via `react-konva-utils` `<Html>` â†’ styled spans represent runs
  - `pushNodeFlattenedContent()` â€” recursively flattens contentEditable DOM back to `TextPart[]`
  - `getNewFormattedContent()` â€” applies formatting to selected range, wraps in `<span>` with CSS
  - `cssStyleToJsCanvasProps()` â€” converts CSS â†” Konva canvas properties
- **Hooks:** `useTextAnnotationEditing()` (selection tracking, format application), `useTextAnnotationPartEditing()` (index-based operations)

### What Already Exists in Our Codebase

- âœ… `BlockType = 'text'` defined in `block.types.ts`
- âœ… Property keys: `TEXT_CONTENT`, `FONT_SIZE`, `FONT_FAMILY` in `property-keys.ts`
- âœ… Defaults: content='Text', fontSize=24, fontFamily='Arial', fillColor=black in `block-defaults.ts`
- âœ… Basic Konva rendering: `Konva.Text` + `#updateTextNode()` in `konva-node-factory.ts` (will be replaced)
- âœ… Toolbar button, tool type, keyboard shortcut `t`
- âœ… `PropertyValue` type system: `number | string | boolean | Color` (needs extension for `TextRun[]`)
- âœ… Snapshot deep-copy handles Color objects (needs extension for arrays)
- âœ… `SetPropertyCommand` takes generic `PropertyValue` (works once type extended)
- âŒ **Missing:** TextRun type, TEXT_RUNS property, FormattedText renderer, range-based API, useTextTool hook, panels, inline editing

### Key Architecture Constraint: PropertyValue Extension

Current `PropertyValue = number | string | boolean | Color`. Must be extended to `| TextRun[]` for array-of-runs storage. This impacts:

- `block.types.ts` â€” type union
- `block-snapshot.ts` â€” `deepCopyProperties()` must deep-clone arrays
- `block-properties.ts` â€” getters need a `getTextRuns()` method

Everything else (commands, store) works generically.

---

## Implementation Steps

### Phase A: Engine â€” Rich Text Data Model

**Step 1. Define `TextRun` type and extend `PropertyValue`** _(depends on nothing)_

- File: `packages/engine/src/block/block.types.ts`
- Add:
  ```ts
  interface TextRunStyle {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    fill?: string;
    letterSpacing?: number;
    textDecoration?: string;
  }
  interface TextRun {
    text: string;
    style: TextRunStyle;
  }
  type PropertyValue = number | string | boolean | Color | TextRun[];
  ```
- Each `TextRun` is a contiguous segment with its own styling. The full text = concatenation of all `run.text` values.
- `startIndex`/`endIndex` are **computed at runtime** from run order â€” not stored (simpler than filerobot, avoids sync issues). See DEP-1.

**Step 2. Add `TEXT_RUNS` property key and block-level text properties** _(parallel with Step 1)_

- File: `packages/engine/src/block/property-keys.ts`
- Add: `TEXT_RUNS` ('text/runs'), `TEXT_ALIGN` ('text/align'), `TEXT_LINE_HEIGHT` ('text/lineHeight'), `TEXT_VERTICAL_ALIGN` ('text/verticalAlign'), `TEXT_PADDING` ('text/padding'), `TEXT_WRAP` ('text/wrap')
- **Design note:** Per-run properties (fontSize, fontFamily, fontWeight, fontStyle, fill, letterSpacing, textDecoration) live inside `TextRun.style`. Block-level properties (align, lineHeight, verticalAlign, padding, wrap) apply to the whole text block.

**Step 3. Update text defaults** _(depends on Steps 1-2)_

- File: `packages/engine/src/block/block-defaults.ts`
- Default text block:
  ```ts
  TEXT_RUNS: [
    {
      text: "Text",
      style: {
        fontSize: 24,
        fontFamily: "Arial",
        fontWeight: "normal",
        fontStyle: "normal",
        fill: "#000000",
        letterSpacing: 0,
      },
    },
  ];
  TEXT_ALIGN: "left";
  TEXT_LINE_HEIGHT: 1.2;
  TEXT_VERTICAL_ALIGN: "top";
  TEXT_PADDING: 4;
  TEXT_WRAP: "word";
  ```
- Keep `TEXT_CONTENT`, `FONT_SIZE`, `FONT_FAMILY`, `FILL_COLOR` on text blocks as **fallback/convenience** aliases. When `TEXT_RUNS` is present, it takes priority.

**Step 4. Fix snapshot deep-copy for TextRun arrays** _(depends on Step 1)_

- File: `packages/engine/src/block/block-snapshot.ts`
- Extend `deepCopyProperties()`: add `Array.isArray(v)` check â†’ deep-clone each element (spread objects + nested style spread)
- Critical for undo/redo correctness â€” `TextRun[]` is mutable reference type.

### Phase B: Engine â€” FormattedText Renderer

**Step 5. Create `FormattedText` custom Konva shape** _(depends on Step 1)_

- New file: `packages/engine/src/konva/formatted-text.ts`
- `class FormattedText extends Konva.Shape` that:
  - Accepts `textRuns: TextRun[]`, `align`, `lineHeight`, `verticalAlign`, `padding`, `wrap`, `width`, `height`
  - In `_sceneFunc(context)`: manually lays out text on canvas
    - **IMP-1:** Binary search line breaking (O(log n)) for finding longest fitting substring. Reference: FormattedText.js lines 270-340.
    - Per-run font measurement, horizontal/vertical alignment
    - Character-by-character drawing when `letterSpacing > 0`
    - **IMP-7:** Proportional text decoration: underline at `y + fontSize/2`, stroke width = `fontSize/15`. Reference: FormattedText.js lines ~500-530.
  - `_hitFunc(context)`: filled rect matching text bounds for click detection
  - **IMP-10:** `getPlainText()` with `_plainTextCache` â€” cached concatenation, invalidated on `textRuns` change
  - `findRunAtIndex(charIndex)` â€” maps global char index to `{ runIndex, offsetInRun }`
- **Reference:** Adapted from filerobot's `FormattedText.js` (~950 lines), simplified â€” no baselineShift, no cap-height trimming (DEP-2).

**Step 6. Replace `Konva.Text` with `FormattedText` in konva-node-factory** _(depends on Step 5)_

- File: `packages/engine/src/konva/konva-node-factory.ts`
- `createNode()`: change text branch from `new Konva.Text(...)` to `new FormattedText(...)`
- `#updateTextNode()`: rewrite to pass `TextRun[]` + block-level props to `FormattedText` setters
- Fallback: if `TEXT_RUNS` not present, construct single-run from `TEXT_CONTENT`/`FONT_SIZE`/`FONT_FAMILY`/`FILL_COLOR`

### Phase C: Engine â€” Range-Based Text API (img.ly-style)

**Step 7. Add range-based text methods on BlockAPI** _(depends on Steps 1-3, 8)_

- File: `packages/engine/src/block/block-api.ts`
- **Content manipulation:**
  - `replaceText(blockId, from, to, newText)` â€” replace characters, inherit style from `from` position
  - `removeText(blockId, from, to)` â€” remove characters, merge adjacent same-style runs
  - `addText(parentId, text, x, y, width, height): number` â€” convenience helper matching `addShape()`
- **Range styling (setters):** Each calls `mergeAdjacentRuns()` at exit (**IMP-2**)
  - `setTextColor(blockId, from, to, color)`
  - `setTextFontWeight(blockId, from, to, weight)`
  - `setTextFontSize(blockId, from, to, size)`
  - `setTextFontStyle(blockId, from, to, style)`
  - `setTextFontFamily(blockId, from, to, family)`
  - `setTextLetterSpacing(blockId, from, to, spacing)`
  - `setTextDecoration(blockId, from, to, decoration)`
  - `toggleBoldFont(blockId, from, to)` â€” toggle between 'bold' and 'normal'
  - `toggleItalicFont(blockId, from, to)` â€” toggle between 'italic' and 'normal'
- **Range styling (getters):**
  - `getTextColors(blockId, from, to): string[]`
  - `getTextFontWeights(blockId, from, to): string[]`
  - `getTextFontSizes(blockId, from, to): number[]`
  - `getTextFontStyles(blockId, from, to): string[]`
  - `getTextFontFamilies(blockId, from, to): string[]`
- **Block-level:**
  - `setTextAlign(blockId, align)` / `getTextAlign(blockId)`
  - `setTextLineHeight(blockId, lineHeight)` / `getTextLineHeight(blockId)`
  - `getTextContent(blockId): string` â€” concatenated plain text from runs

**Step 8. Implement run-splitting utility** _(depends on Step 1, used by Step 7)_

- New file: `packages/engine/src/block/text-run-utils.ts`
- Core **pure functions** (no mutation â€” critical for command-based undo/redo):
  - `splitRunsAtBoundaries(runs, from, to)` â€” split runs so boundaries fall exactly on run edges
  - `setStyleOnRange(runs, from, to, styleProp, value)` â€” apply a style property to a character range
  - `mergeAdjacentRuns(runs)` â€” merge consecutive runs with identical styles
  - `removeRange(runs, from, to)` â€” remove characters in range
  - `insertText(runs, at, text)` â€” insert text, inheriting style from surrounding run
  - `getPlainText(runs)` â€” concatenate all `run.text`
  - `getRunIndices(runs)` â€” compute `{start, end}[]` from run order

**Step 9. Export new types and API from engine index** _(depends on Steps 7-8)_

- Files: `packages/engine/src/block/index.ts`, `packages/engine/src/index.ts`
- Export: `TextRun`, `TextRunStyle`, new text property key constants

### Phase D: UI â€” Text Tool, Panel & Properties Panel _(future)_

Steps 10-16 cover UI integration (text tool hook, panels, inline editing overlay, DOM â†” TextRun[] conversion, store wiring). These will be implemented after the engine phases are complete and tested.

### Phase F: Tests

**Step 17. Unit tests for text-run-utils**

- File: `packages/engine/src/__tests__/text-run-utils.test.ts`
- Test all pure functions + edge cases (empty runs, single char, overlapping boundaries, full-select)

**Step 18. Unit tests for range-based BlockAPI methods**

- Test: replaceText, removeText, setTextColor/FontWeight/FontSize, toggleBoldFont, getTextContent
- Test undo/redo: set style â†’ undo â†’ verify runs restored

---

## Improvements Over Filerobot (Code Review Findings)

### Critical (Must Include)

| ID    | Improvement                                | Reference                                                                   | Why                                             |
| ----- | ------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------- |
| IMP-1 | Binary search line breaking                | FormattedText.js L270-340                                                   | O(log n) vs O(n) for longest fitting substring  |
| IMP-2 | Mandatory run merging after every style op | useTextAnnotationEditing.js `updateTextFormats()` â€” filerobot doesn't merge | Prevents run fragmentation over time            |
| IMP-3 | Selection persistence on blur via `<mark>` | TextNodeContentTextarea.jsx `keepSelectionOnBlur()`                         | Without this, clicking toolbar loses selection  |
| IMP-4 | Paste handling â€” plain text only           | TextNodeContentTextarea.jsx `handleOnPaste()`                               | Prevents HTML injection from external sources   |
| IMP-5 | CSS â†” Canvas bidirectional mapping         | TextNode.utils.js `cssStyleToJsCanvasProps()` L42-85                        | Correct roundtrip: TextRun[] â†’ HTML â†’ TextRun[] |
| IMP-6 | Two-path format (whole vs range)           | useTextAnnotationEditing.js `updateTextFormats()`                           | Separate block-level from per-run props         |

### Important (Recommended)

| ID     | Improvement                          | Reference                                             | Why                                     |
| ------ | ------------------------------------ | ----------------------------------------------------- | --------------------------------------- |
| IMP-7  | Proportional text decoration         | FormattedText.js L500-530                             | Scales correctly at any font size       |
| IMP-8  | Adjacent same-style DOM node merging | TextNode.utils.js `getNewFormattedContent()` L113-118 | Prevents DOM/run fragmentation          |
| IMP-9  | Input diffing for change tracking    | TextNode.utils.js `calculateTextChanges()` L250-310   | Precise undo granularity                |
| IMP-10 | Cached plainText getter              | FormattedText.js `getFullText()` L60                  | Avoids re-concatenation on every access |

### Deliberate Departures

| ID    | Departure                          | Why                                                                    |
| ----- | ---------------------------------- | ---------------------------------------------------------------------- |
| DEP-1 | No stored startIndex/endIndex      | Compute from `run.text.length` at runtime â€” simpler, no sync bugs      |
| DEP-2 | No baselineShift / cap-height trim | Standard positioning avoids inconsistency with contentEditable overlay |
| DEP-3 | No custom DOM events               | Use Zustand store + direct engine API â€” cleaner, no global listeners   |
| DEP-4 | No detached text concept           | Handle replacement via `replaceText()` at TextRun[] level directly     |

---

## Decisions

- **Rich text from the start** â€” character-level styling via `TextRun[]` array, matching img.ly's range-based API and filerobot's array-of-parts model.
- **Custom `FormattedText` Konva.Shape** â€” replaces `Konva.Text` which can't do per-run styling. Adapted from filerobot's FormattedText.js, simplified.
- **TextRun indices computed at runtime** â€” runs are ordered in the array; startIndex/endIndex derived from accumulated `run.text.length`. No stored indices (simpler than filerobot).
- **Block-level vs run-level split:** alignment, lineHeight, verticalAlign, padding, wrap are **block-level**. fontSize, fontFamily, fontWeight, fontStyle, fill, letterSpacing, textDecoration are **per-run**.
- **`PropertyValue` extended** to include `TextRun[]` â€” requires snapshot deep-copy update. SetPropertyCommand works generically.
- **contentEditable div overlay** for inline editing with native text selection/cursor. Styled spans map 1:1 to TextRun array.
- **System fonts only** â€” no custom font loading. Font list configurable via image-editor config prop.
- **Backward compatible** â€” old TEXT_CONTENT/FONT_SIZE/FONT_FAMILY properties still work as fallback when TEXT_RUNS is absent.

## Verification

1. **Unit tests pass:** `pnpm --filter @editx/engine test` â€” text-run-utils, range-based API, undo/redo
2. **Add text:** Click Text tool â†’ "Add Heading" â†’ text block appears centered (Arial 48px black)
3. **Whole-block styling:** Select text â†’ properties panel â†’ change font/size/color/alignment â†’ updates in real-time + undo step
4. **Inline editing:** Double-click text â†’ contentEditable overlay appears, matching text style â†’ type/delete content â†’ click away â†’ committed
5. **Character-level styling:** Double-click text â†’ select a word â†’ click Bold in properties â†’ only that word becomes bold â†’ other text unchanged
6. **Multi-style render:** Text with mixed bold/normal/colored runs renders correctly on canvas via FormattedText
7. **Range getters:** Select mixed-style range â†’ properties panel shows "Mixed" for font size, shows all unique colors
8. **Undo/Redo:** Every operation (add, edit, style range) undoable via Ctrl+Z / Ctrl+Y
9. **Delete:** Select text block â†’ Delete â†’ removed. Undo restores with all runs intact.
10. **Compose:** FormattedText renders correctly alongside cropped images, shapes, filters

## Relevant Files

### Engine (modify)

- `packages/engine/src/block/block.types.ts` â€” TextRun, TextRunStyle types, extend PropertyValue
- `packages/engine/src/block/property-keys.ts` â€” TEXT_RUNS, TEXT_ALIGN, TEXT_LINE_HEIGHT, TEXT_VERTICAL_ALIGN, TEXT_PADDING, TEXT_WRAP
- `packages/engine/src/block/block-defaults.ts` â€” rich text defaults with initial TextRun[]
- `packages/engine/src/block/block-snapshot.ts` â€” deep-copy TextRun arrays
- `packages/engine/src/block/block-properties.ts` â€” getTextRuns() accessor
- `packages/engine/src/block/block-api.ts` â€” range-based text API methods
- `packages/engine/src/konva/konva-node-factory.ts` â€” replace Konva.Text with FormattedText
- `packages/engine/src/block/index.ts` â€” re-export new types
- `packages/engine/src/index.ts` â€” re-export new types and constants

### Engine (create)

- `packages/engine/src/konva/formatted-text.ts` â€” custom Konva.Shape for multi-run text rendering
- `packages/engine/src/block/text-run-utils.ts` â€” pure functions for run splitting, merging, range styling

### UI (create â€” Phase D, future)

- `packages/image-editor/src/hooks/use-text-tool.ts`
- `packages/image-editor/src/components/panels/text-panel.tsx`
- `packages/image-editor/src/components/panels/text-properties-panel.tsx`
- `packages/image-editor/src/components/text-editor-overlay.tsx`
- `packages/image-editor/src/utils/text-dom-utils.ts`
