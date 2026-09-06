import Konva from "konva";
import type { TextCurveDirection, TextRun } from "../block/block.types";

/**
 * The attribute surface of {@link FormattedText}, split out so the shape itself
 * stays focused on layout, paint and bounds.
 *
 * Every accessor follows Konva's overloaded convention: no argument reads (and
 * substitutes the attribute's default when unset), one argument writes and
 * returns `this` for chaining.
 */
export class FormattedTextAttrs extends Konva.Shape {
  textRuns(): TextRun[];
  textRuns(val: TextRun[]): this;
  textRuns(val?: TextRun[]): TextRun[] | this {
    if (val === undefined) return this.getAttr("textRuns") ?? [];
    this.setAttr("textRuns", val);
    return this;
  }

  align(): string;
  align(val: string): this;
  align(val?: string): string | this {
    if (val === undefined) return this.getAttr("align") ?? "left";
    this.setAttr("align", val);
    return this;
  }

  verticalAlign(): string;
  verticalAlign(val: string): this;
  verticalAlign(val?: string): string | this {
    if (val === undefined) return this.getAttr("verticalAlign") ?? "top";
    this.setAttr("verticalAlign", val);
    return this;
  }

  lineHeight(): number;
  lineHeight(val: number): this;
  lineHeight(val?: number): number | this {
    if (val === undefined) return this.getAttr("lineHeight") ?? 1.2;
    this.setAttr("lineHeight", val);
    return this;
  }

  padding(): number;
  padding(val: number): this;
  padding(val?: number): number | this {
    if (val === undefined) return this.getAttr("padding") ?? 0;
    this.setAttr("padding", val);
    return this;
  }

  wrap(): string;
  wrap(val: string): this;
  wrap(val?: string): string | this {
    if (val === undefined) return this.getAttr("wrap") ?? "word";
    this.setAttr("wrap", val);
    return this;
  }

  curveRadius(): number;
  curveRadius(val: number): this;
  curveRadius(val?: number): number | this {
    if (val === undefined) return this.getAttr("curveRadius") ?? 0;
    this.setAttr("curveRadius", val);
    return this;
  }

  curveDirection(): TextCurveDirection;
  curveDirection(val: TextCurveDirection): this;
  curveDirection(val?: TextCurveDirection): TextCurveDirection | this {
    if (val === undefined) return this.getAttr("curveDirection") ?? "up";
    this.setAttr("curveDirection", val);
    return this;
  }

  /** Index of the run containing `charIndex`, and the offset inside it. */
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
}
