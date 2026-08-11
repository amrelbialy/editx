import type {
  BlockData,
  Color,
  GradientStop,
  PropertyValue,
  TextRun,
  TextRunStyle,
} from "./block.types";

/**
 * Creates deep-copy snapshots of blocks for undo/redo.
 * Operates on the shared blocks Map owned by BlockStore.
 */
export class BlockSnapshot {
  #blocks: Map<number, BlockData>;

  constructor(blocks: Map<number, BlockData>) {
    this.#blocks = blocks;
  }

  snapshot(id: number): BlockData | null {
    const block = this.#blocks.get(id);
    if (!block) return null;

    return {
      ...block,
      children: [...block.children],
      effectIds: [...block.effectIds],
      properties: deepCopyProperties(block.properties),
    };
  }

  restore(data: BlockData): void {
    this.#blocks.set(data.id, {
      ...data,
      children: [...data.children],
      effectIds: [...data.effectIds],
      properties: deepCopyProperties(data.properties),
    });
  }
}

/** Deep-copy a properties bag (handles nested Color, TextRun[], and GradientStop[]). */
function deepCopyProperties(props: Record<string, PropertyValue>): Record<string, PropertyValue> {
  const copy: Record<string, PropertyValue> = {};
  for (const key in props) {
    const v = props[key];
    if (Array.isArray(v)) {
      // Discriminate on element shape: a GradientStop has `offset`, a TextRun
      // has `text`. Cloning every array as TextRun[] silently corrupted
      // GradientStop[] on snapshot/restore (broke undo/redo + save/load).
      const first = v[0];
      const isGradient = first != null && typeof first === "object" && "offset" in first;
      copy[key] = isGradient
        ? (v as GradientStop[]).map((s) => ({ offset: s.offset, color: s.color }))
        : (v as TextRun[]).map((r) => ({ text: r.text, style: cloneRunStyle(r.style) }));
    } else if (v && typeof v === "object" && "r" in v) {
      copy[key] = { ...(v as Color) };
    } else {
      copy[key] = v;
    }
  }
  return copy;
}

/** Clone a run style, deep-copying the nested `fillGradient` (type + stops). */
function cloneRunStyle(style: TextRunStyle): TextRunStyle {
  const copy: TextRunStyle = { ...style };
  if (style.fillGradient) {
    copy.fillGradient = {
      type: style.fillGradient.type,
      angle: style.fillGradient.angle,
      stops: style.fillGradient.stops.map((s) => ({ offset: s.offset, color: s.color })),
    };
  }
  return copy;
}
