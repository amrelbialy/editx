import type { EditxEngine } from "@editx/engine";
import { colorToHex, FILL_SOLID_COLOR, TEXT_ALIGN } from "@editx/engine";

/** Snapshot of the text style shown in the properties toolbar. */
export type TextState = ReturnType<typeof readTextState>;

export function readTextState(engine: EditxEngine, blockId: number, selectionStart?: number) {
  const runs = engine.block.getTextRuns(blockId);
  const align = engine.block.getString(blockId, TEXT_ALIGN);

  let targetStyle = runs[0]?.style ?? {};
  if (selectionStart != null && selectionStart > 0) {
    let offset = 0;
    for (const run of runs) {
      if (offset + run.text.length > selectionStart) {
        targetStyle = run.style;
        break;
      }
      offset += run.text.length;
    }
  }

  return {
    fontSize: targetStyle.fontSize ?? 24,
    fontFamily: targetStyle.fontFamily ?? "Arial",
    fontWeight: targetStyle.fontWeight ?? "normal",
    fontStyle: targetStyle.fontStyle ?? "normal",
    fill: targetStyle.fill ?? "#000000",
    textDecoration: targetStyle.textDecoration ?? "",
    textAlign: align || "left",
    opacity: engine.block.getOpacity(blockId),
  };
}

export function readBlockColor(engine: EditxEngine, blockId: number): string {
  const fillId = engine.block.getFill(blockId);
  if (fillId != null) {
    const c = engine.block.getColor(fillId, FILL_SOLID_COLOR);
    if (c) return colorToHex(c).substring(0, 7);
  }
  return "#4a90e2";
}
