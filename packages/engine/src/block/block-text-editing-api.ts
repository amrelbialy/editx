import type { EngineCore } from "../engine-core";
import type { TextRun } from "./block.types";
import * as H from "./block-api-helpers";
import { TEXT_RUNS } from "./property-keys";
import { TextEditorSession } from "./text-editor-session";
import { getPlainText, insertText, removeRange, replaceRange } from "./text-run-utils";

/** Text content and editing-session ownership, including sessions whose blocks were removed. */
export class BlockTextEditingAPI {
  #sessions = new Map<number, TextEditorSession>();

  constructor(private readonly engine: EngineCore) {
    engine.on("_scene:replacing", () => {
      for (const session of this.#sessions.values()) session.dispose();
      this.#sessions.clear();
    });
  }

  beginTextEditing(blockId: number): TextEditorSession {
    let session = this.#sessions.get(blockId);
    if (session) return session;
    session = new TextEditorSession(blockId, this.getTextRuns(blockId), (runs) => {
      H.setProperty(this.engine, blockId, TEXT_RUNS, runs);
    });
    this.#sessions.set(blockId, session);
    return session;
  }

  getTextEditingSession(blockId: number): TextEditorSession | null {
    return this.#sessions.get(blockId) ?? null;
  }

  endTextEditing(blockId: number): void {
    const session = this.#sessions.get(blockId);
    if (!session) return;
    session.dispose();
    this.#sessions.delete(blockId);
  }

  getTextRuns(blockId: number): TextRun[] {
    const value = H.getProperty(this.engine, blockId, TEXT_RUNS);
    return Array.isArray(value) ? (value as TextRun[]) : [];
  }

  getTextContent(blockId: number): string {
    return getPlainText(this.getTextRuns(blockId));
  }

  insertTextAt(blockId: number, position: number, text: string): void {
    H.setProperty(
      this.engine,
      blockId,
      TEXT_RUNS,
      insertText(this.getTextRuns(blockId), position, text),
    );
  }

  removeText(blockId: number, start: number, end: number): void {
    H.setProperty(
      this.engine,
      blockId,
      TEXT_RUNS,
      removeRange(this.getTextRuns(blockId), start, end),
    );
  }

  replaceText(blockId: number, start: number, end: number, text: string): void {
    H.setProperty(
      this.engine,
      blockId,
      TEXT_RUNS,
      replaceRange(this.getTextRuns(blockId), start, end, text),
    );
  }
}
