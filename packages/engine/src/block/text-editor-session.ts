import { $patchStyleText } from "@lexical/selection";
import {
  $getSelection,
  $isRangeSelection,
  createEditor,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
} from "lexical";
import type { TextRun, TextRunStyle } from "./block.types";
import {
  $restoreSelectionFromOffsets,
  editorStateToRuns,
  getSelectionOffsets,
  runsToEditorState,
  textRunStyleToCssPatch,
} from "./lexical-bridge";

export type TextEditorSessionOnChange = (runs: TextRun[]) => void;

/**
 * Manages a Lexical editor instance for a text block during active editing.
 * Single source of truth: all text mutations flow through Lexical, then out as TextRun[].
 */
export class TextEditorSession {
  readonly blockId: number;
  readonly editor: LexicalEditor;

  #onChange: TextEditorSessionOnChange;
  #unregisterListener: (() => void) | null = null;
  #isProgrammatic = false;

  constructor(blockId: number, initialRuns: TextRun[], onChange: TextEditorSessionOnChange) {
    this.blockId = blockId;
    this.#onChange = onChange;

    this.editor = createEditor({
      namespace: "TextEditorSession",
      onError: (error: Error) => {
        console.error("TextEditorSession Lexical error:", error);
      },
    });

    // Populate with initial content
    runsToEditorState(this.editor, initialRuns);

    // Listen for changes from typing / DOM input (not programmatic API calls)
    this.#unregisterListener = this.editor.registerUpdateListener(({ editorState, tags }) => {
      if (this.#isProgrammatic) return;
      const runs = editorStateToRuns(editorState);
      this.#onChange(runs);
    });
  }

  /** Get the Lexical editor for React DOM attachment via editor.setRootElement(). */
  getEditor(): LexicalEditor {
    return this.editor;
  }

  /** Read current selection as character offsets. */
  getSelection(): { from: number; to: number } | null {
    return getSelectionOffsets(this.editor.getEditorState());
  }

  /**
   * Apply a partial TextRunStyle update to characters in [start, end).
   * Splits format-flag properties (bold/italic/underline/strikethrough) from CSS properties.
   * Synchronously pushes the result to onChange.
   */
  setTextStyle(start: number, end: number, update: Partial<TextRunStyle>): void {
    this.#isProgrammatic = true;
    try {
      this.editor.update(
        () => {
          // Set selection to the target range
          $restoreSelectionFromOffsets(start, end);
          const sel = $getSelection();
          if (!$isRangeSelection(sel)) return;

          // ── Format-flag properties (must use FORMAT_TEXT_COMMAND path) ──
          if (update.fontWeight !== undefined) {
            const isBold = sel.hasFormat("bold");
            const wantBold = update.fontWeight === "bold" || update.fontWeight === "700";
            if (isBold !== wantBold) {
              this.editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
            }
          }
          if (update.fontStyle !== undefined) {
            const isItalic = sel.hasFormat("italic");
            const wantItalic = update.fontStyle === "italic";
            if (isItalic !== wantItalic) {
              this.editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
            }
          }
          if (update.textDecoration !== undefined) {
            const decoValue = update.textDecoration ?? "";
            const hasUnderline = sel.hasFormat("underline");
            const wantUnderline = decoValue.includes("underline");
            if (hasUnderline !== wantUnderline) {
              this.editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
            }
            const hasStrikethrough = sel.hasFormat("strikethrough");
            const wantStrikethrough = decoValue.includes("line-through");
            if (hasStrikethrough !== wantStrikethrough) {
              this.editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
            }
          }

          // ── CSS properties (use $patchStyleText) ──
          const cssPatch = textRunStyleToCssPatch(update);
          if (Object.keys(cssPatch).length > 0) {
            // Re-read selection since FORMAT_TEXT_COMMAND may have split nodes
            const currentSel = $getSelection();
            if ($isRangeSelection(currentSel)) {
              $patchStyleText(currentSel, cssPatch);
            }
          }
        },
        { discrete: true },
      );

      // Synchronous readback — push to engine immediately
      const runs = editorStateToRuns(this.editor.getEditorState());
      this.#onChange(runs);
    } finally {
      this.#isProgrammatic = false;
    }
  }

  /** Set text color for characters in [start, end). */
  setTextColor(start: number, end: number, color: string): void {
    this.setTextStyle(start, end, { fill: color });
  }

  /** Set font size for characters in [start, end). */
  setTextFontSize(start: number, end: number, fontSize: number): void {
    this.setTextStyle(start, end, { fontSize });
  }

  /** Set font family for characters in [start, end). */
  setTextFontFamily(start: number, end: number, fontFamily: string): void {
    this.setTextStyle(start, end, { fontFamily });
  }

  /** Toggle bold on characters in [start, end). */
  toggleBold(start: number, end: number): void {
    this.#isProgrammatic = true;
    try {
      this.editor.update(
        () => {
          $restoreSelectionFromOffsets(start, end);
          this.editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        },
        { discrete: true },
      );
      const runs = editorStateToRuns(this.editor.getEditorState());
      this.#onChange(runs);
    } finally {
      this.#isProgrammatic = false;
    }
  }

  /** Toggle italic on characters in [start, end). */
  toggleItalic(start: number, end: number): void {
    this.#isProgrammatic = true;
    try {
      this.editor.update(
        () => {
          $restoreSelectionFromOffsets(start, end);
          this.editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        },
        { discrete: true },
      );
      const runs = editorStateToRuns(this.editor.getEditorState());
      this.#onChange(runs);
    } finally {
      this.#isProgrammatic = false;
    }
  }

  /** Clean up listeners. */
  dispose(): void {
    if (this.#unregisterListener) {
      this.#unregisterListener();
      this.#unregisterListener = null;
    }
  }
}
