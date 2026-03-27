# Feature 13: Lexical-Based Text Editor Overlay

## TL;DR

Replace the fragile `contentEditable â†’ HTML â†’ TextRun[]` bridge with **Lexical** for the inline text editor overlay. The engine layer (TextRun model, block-api, text-run-utils) and canvas renderer (FormattedText) remain untouched. The entire `text-dom-utils.ts` (~220 lines) is deleted and replaced by ~60 lines of Lexical state serialization. Net result: fewer lines, zero DOM parsing, built-in IME/undo/keyboard support.

## Why

The current editing overlay uses a raw `contentEditable` div and manually converts between HTML DOM and `TextRun[]`. This approach has critical issues:

1. **Lossy round-trip**: `runsToHtml()` generates styled `<span>` HTML, but browsers mangle contentEditable DOM (inserting `<div>`, `<b>`, `<font>` tags). `htmlToRuns()` uses `getComputedStyle()` to reverse-engineer styles, losing `fontWeight` values beyond 400/700, breaking multi-family `fontFamily`, and failing on non-rgb colors.
2. **Buggy selection tracking**: `getCharOffset()` has unreliable element-node path for nested structures and `<br>` positions.
3. **Deprecated API**: `document.execCommand('insertText')` for paste handling.
4. **150ms input lag**: Debounced sync means 150ms window where visible Konva text is stale.
5. **Race condition**: `isLocalEdit` flag can misfire when engine emits multiple events for one property change.
6. **No IME support**: Debounced `onInput` + DOM-to-runs conversion interrupts CJK composition.
7. **No keyboard shortcuts**: No Ctrl+B/I/U while inline-editing.
8. **No session undo**: contentEditable's built-in undo is disconnected from the engine.
9. **Duplicated code**: `stylesMatch`/`mergeAdjacentStyledRuns` duplicate engine's `text-run-utils`.
10. **Zero tests** for the most fragile file in the codebase.

## Architecture

### Before (current)

```
User types â†’ contentEditable div â†’ onInput(150ms debounce) â†’ htmlToRuns(DOMâ†’TextRun[]) â†’ engine
Engine change â†’ TextRun[] â†’ runsToHtml(TextRun[]â†’HTML) â†’ el.innerHTML â†’ restore cursor
```

### After (Lexical)

```
User types â†’ Lexical EditorState â†’ onChange â†’ editorStateToRuns(stateâ†’TextRun[]) â†’ engine
Engine change â†’ TextRun[] â†’ runsToEditorState(TextRun[]â†’state) â†’ editor.update()
```

The bridge becomes **Lexical JSON state â†” TextRun[]** instead of **HTML â†” TextRun[]**. No DOM parsing. No `getComputedStyle`. No browser-mangled HTML.

### What stays unchanged

- `TextRun[]` data model in the engine
- `text-run-utils.ts` (pure utility functions)
- `block-api.ts` text methods (range-based API)
- `FormattedText` Konva renderer (canvas rendering)
- `TextEditToolbar` component (calls engine API directly)
- `TextPropertiesPanel` component
- `BlockPropertiesBar` component
- `image-editor-store.ts` shape (`editingTextBlockId`, `textSelectionRange`)
- `image-editor.tsx` rendering logic (same `<TextEditorOverlay>` props)
- `styles.css` transparent text overlay rules

## Design Decisions

| Decision                        | Choice                                      | Rationale                                                                  |
| ------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| Keyboard shortcuts (Ctrl+B/I/U) | Route through engine API                    | Single source of truth â€” same path as toolbar buttons                      |
| Undo/redo scope                 | Lexical `HistoryPlugin` (session-scoped)    | Engine history records final TextRun[] on close; local undo more intuitive |
| Zoom scaling                    | CSS `transform: scale(zoom)` on container   | Simpler than per-node font math; Lexical nodes use 1:1 font sizes          |
| Style storage in Lexical        | `node.setStyle()` CSS string + format flags | Lexical natively supports inline CSS + bold/italic flags                   |
| Paste handling                  | `PASTE_COMMAND` â†’ plain text only           | Replaces deprecated `document.execCommand`                                 |
| Blur detection                  | `BLUR_COMMAND` + portal-awareness checks    | Same Radix portal awareness, cleaner than `setTimeout(10ms)`               |

## Implementation

### Phase 1: Dependencies & Bridge Utils

**Install:**

```bash
pnpm add lexical @lexical/react --filter @editx/image-editor
```

**Create `lexical-bridge.ts`** (~60 lines):

- `runsToEditorState(editor, runs)` â€” TextRun[] â†’ Lexical state
- `editorStateToRuns(editorState)` â€” Lexical state â†’ TextRun[]
- `getSelectionOffsets(editorState)` â€” Lexical selection â†’ `{ from, to }`
- Import `mergeAdjacentRuns` from engine (needs export)

### Phase 2: Rewrite TextEditorOverlay

Replace the component internals with:

- `<LexicalComposer>` â†’ `<RichTextPlugin>` â†’ `<ContentEditable>` â†’ `<HistoryPlugin>`
- `EngineSyncPlugin` â€” mount: load runs â†’ Lexical; onChange: Lexical â†’ engine; engine events: engine â†’ Lexical
- `SelectionSyncPlugin` â€” Lexical selection â†’ store `{ from, to }`
- `KeyboardShortcutsPlugin` â€” Ctrl+B/I/U â†’ engine API, Escape â†’ close
- Container: `getOverlayStyle()` + `transform: scale(zoom)`, `transformOrigin: top left`

### Phase 3: CSS Update

Add `[data-text-editor-overlay] p { margin: 0; }` â€” Lexical renders `<p>` nodes.

### Phase 4: Cleanup

Delete `text-dom-utils.ts` (220 lines, sole consumer is the old overlay).

### Phase 5: Tests

Create `lexical-bridge.test.ts`:

- Round-trip preservation of text + all style properties
- Multi-paragraph / newline handling
- Mixed styles within a paragraph
- Edge cases: empty runs, empty text

## Files Changed

| File                                                           | Action  | Lines        |
| -------------------------------------------------------------- | ------- | ------------ |
| `packages/image-editor/src/utils/text-dom-utils.ts`            | DELETE  | -220         |
| `packages/image-editor/src/utils/lexical-bridge.ts`            | CREATE  | +80          |
| `packages/image-editor/src/utils/lexical-bridge.test.ts`       | CREATE  | +100         |
| `packages/image-editor/src/components/text-editor-overlay.tsx` | REWRITE | -240, +150   |
| `packages/image-editor/src/styles.css`                         | MODIFY  | +3           |
| `packages/image-editor/package.json`                           | MODIFY  | +2 deps      |
| `packages/engine/src/block/index.ts`                           | MODIFY  | +1 export    |
| `packages/engine/src/index.ts`                                 | MODIFY  | +1 re-export |

**Net: ~-270 lines, gained IME/undo/keyboard/cross-browser support, eliminated all DOM-parsing bugs.**

## Verification

1. `pnpm build` â€” no TypeScript errors
2. `pnpm test` â€” bridge round-trip tests pass
3. Manual: double-click text â†’ overlay opens, Konva text visible, caret blinks
4. Manual: type â†’ Konva re-renders in sync (no lag)
5. Manual: select text + Bold toolbar â†’ formatting applied, overlay stays open
6. Manual: Ctrl+B/I with selection â†’ toggles formatting
7. Manual: Ctrl+Z â†’ undoes last text edit within session
8. Manual: paste rich text â†’ plain text only
9. Manual: click outside â†’ overlay closes
10. Manual: toolbar color picker â†’ focus returns to editor
11. Manual: zoom in/out â†’ overlay scales correctly
