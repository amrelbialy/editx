import { AppendChildCommand, CreateBlockCommand } from "../controller/commands";
import type { EngineCore } from "../engine-core";
import type { TextRun, TextRunStyle } from "./block.types";
import * as H from "./block-api-helpers";
import { TEXT_ALIGN, TEXT_LINE_HEIGHT, TEXT_RUNS, TEXT_VERTICAL_ALIGN } from "./property-keys";
import { TextEditorSession } from "./text-editor-session";
import {
  getPlainText as utilGetPlainText,
  insertText as utilInsertText,
  removeRange as utilRemoveRange,
  replaceRange as utilReplaceRange,
  setStyleOnRange as utilSetStyleOnRange,
} from "./text-run-utils";

/** Text editing sessions, range-based text editing, and text block placement. */
export class BlockTextAPI {
  #engine: EngineCore;
  #textEditingSessions = new Map<number, TextEditorSession>();

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  // ── Text editing session lifecycle ────────────────

  beginTextEditing(blockId: number): TextEditorSession {
    let session = this.#textEditingSessions.get(blockId);
    if (session) return session;
    const runs = this.getTextRuns(blockId);
    session = new TextEditorSession(blockId, runs, (newRuns) => {
      H.setProperty(this.#engine, blockId, TEXT_RUNS, newRuns);
    });
    this.#textEditingSessions.set(blockId, session);
    return session;
  }

  getTextEditingSession(blockId: number): TextEditorSession | null {
    return this.#textEditingSessions.get(blockId) ?? null;
  }

  endTextEditing(blockId: number): void {
    const session = this.#textEditingSessions.get(blockId);
    if (session) {
      session.dispose();
      this.#textEditingSessions.delete(blockId);
    }
  }

  // ── Range-based text editing ──────────────────────

  getTextRuns(blockId: number): TextRun[] {
    const val = H.getProperty(this.#engine, blockId, TEXT_RUNS);
    return Array.isArray(val) ? (val as TextRun[]) : [];
  }

  getTextContent(blockId: number): string {
    return utilGetPlainText(this.getTextRuns(blockId));
  }

  insertTextAt(blockId: number, position: number, text: string): void {
    const runs = this.getTextRuns(blockId);
    const newRuns = utilInsertText(runs, position, text);
    H.setProperty(this.#engine, blockId, TEXT_RUNS, newRuns);
  }

  removeText(blockId: number, start: number, end: number): void {
    const runs = this.getTextRuns(blockId);
    const newRuns = utilRemoveRange(runs, start, end);
    H.setProperty(this.#engine, blockId, TEXT_RUNS, newRuns);
  }

  replaceText(blockId: number, start: number, end: number, newText: string): void {
    const runs = this.getTextRuns(blockId);
    const newRuns = utilReplaceRange(runs, start, end, newText);
    H.setProperty(this.#engine, blockId, TEXT_RUNS, newRuns);
  }

  setTextStyle(
    blockId: number,
    start: number,
    end: number,
    styleUpdate: Partial<TextRunStyle>,
  ): void {
    const session = this.#textEditingSessions.get(blockId);
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
    const session = this.#textEditingSessions.get(blockId);
    if (session) {
      session.toggleBold(start, end);
    } else {
      const runs = this.getTextRuns(blockId);
      let currentWeight = "normal";
      let offset = 0;
      for (const run of runs) {
        if (offset + run.text.length > start) {
          currentWeight = run.style.fontWeight ?? "normal";
          break;
        }
        offset += run.text.length;
      }
      const newWeight = currentWeight === "bold" ? "normal" : "bold";
      this.setTextStyle(blockId, start, end, { fontWeight: newWeight });
    }
  }

  toggleItalicText(blockId: number, start: number, end: number): void {
    const session = this.#textEditingSessions.get(blockId);
    if (session) {
      session.toggleItalic(start, end);
    } else {
      const runs = this.getTextRuns(blockId);
      let currentStyle = "normal";
      let offset = 0;
      for (const run of runs) {
        if (offset + run.text.length > start) {
          currentStyle = run.style.fontStyle ?? "normal";
          break;
        }
        offset += run.text.length;
      }
      const newStyle = currentStyle === "italic" ? "normal" : "italic";
      this.setTextStyle(blockId, start, end, { fontStyle: newStyle });
    }
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

  setTextBackgroundColor(
    blockId: number,
    start: number,
    end: number,
    color: string | undefined,
  ): void {
    this.setTextStyle(blockId, start, end, { backgroundColor: color });
  }

  setTextTransform(
    blockId: number,
    start: number,
    end: number,
    transform: "none" | "uppercase" | "lowercase" | "capitalize",
  ): void {
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
    stroke: { color?: string; width?: number },
  ): void {
    this.setTextStyle(blockId, start, end, {
      textStrokeColor: stroke.color,
      textStrokeWidth: stroke.width,
    });
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
    const store = this.#engine.getBlockStore();
    this.#engine.beginBatch();

    const cmd = new CreateBlockCommand(store, "text");
    this.#engine.exec(cmd);
    const textId = cmd.getCreatedId()!;

    H.setFloat(this.#engine, textId, "transform/position/x", x);
    H.setFloat(this.#engine, textId, "transform/position/y", y);
    H.setFloat(this.#engine, textId, "transform/size/width", width);
    H.setFloat(this.#engine, textId, "transform/size/height", height);

    if (initialText !== undefined) {
      const baseStyle: TextRunStyle = { fontSize: 24, fontFamily: "Arial", fill: "#000000" };
      const mergedStyle: TextRunStyle = opts?.style ? { ...baseStyle, ...opts.style } : baseStyle;
      const runs: TextRun[] = [{ text: initialText, style: mergedStyle }];
      H.setProperty(this.#engine, textId, TEXT_RUNS, runs);
    }

    this.#engine.exec(new AppendChildCommand(store, parentId, textId));
    this.#engine.endBatch();
    return textId;
  }
}
