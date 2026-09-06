import { AppendChildCommand, CreateBlockCommand } from "../controller/commands";
import type { EngineCore } from "../engine-core";
import type { TextRun, TextRunStyle } from "./block.types";
import * as H from "./block-api-helpers";
import { TEXT_RUNS } from "./property-keys";

/**
 * Create a text block with optional initial text and append it to `parentId`.
 * Batched into a single undo step. Split out of BlockTextAPI so the editing
 * surface (sessions, range styling) stays under the file-size budget.
 */
export function createTextBlock(
  engine: EngineCore,
  parentId: number,
  x: number,
  y: number,
  width: number,
  height: number,
  initialText?: string,
  opts?: { style?: Partial<TextRunStyle> },
): number {
  const store = engine._getBlockStore();
  engine.beginBatch();

  const cmd = new CreateBlockCommand(store, "text");
  engine.exec(cmd);
  const textId = cmd.getCreatedId()!;

  H.setFloat(engine, textId, "transform/position/x", x);
  H.setFloat(engine, textId, "transform/position/y", y);
  H.setFloat(engine, textId, "transform/size/width", width);
  H.setFloat(engine, textId, "transform/size/height", height);

  if (initialText !== undefined) {
    const baseStyle: TextRunStyle = { fontSize: 24, fontFamily: "Arial", fill: "#000000" };
    const mergedStyle: TextRunStyle = opts?.style ? { ...baseStyle, ...opts.style } : baseStyle;
    const runs: TextRun[] = [{ text: initialText, style: mergedStyle }];
    H.setProperty(engine, textId, TEXT_RUNS, runs);
  }

  engine.exec(new AppendChildCommand(store, parentId, textId));
  engine.endBatch();
  return textId;
}
