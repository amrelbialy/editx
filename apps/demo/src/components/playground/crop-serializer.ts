import { BUILT_IN_RESIZE_GROUPS } from "./crop-presets";
import type { PlaygroundConfig } from "./playground.types";

type Lines = string[];

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const strArr = (v: string[]) => `[${v.map((s) => `"${s}"`).join(", ")}]`;

/** Serialize the selected built-in resize groups as full object literals. */
function resizePresetLines(labels: string[]): Lines {
  const groups = BUILT_IN_RESIZE_GROUPS.filter((g) => labels.includes(g.label));
  const lines: Lines = ["resizePresets: ["];
  for (const group of groups) {
    lines.push("  {");
    lines.push(`    label: "${group.label}",`);
    lines.push("    presets: [");
    for (const p of group.presets) {
      lines.push(`      { label: "${p.label}", width: ${p.width}, height: ${p.height} },`);
    }
    lines.push("    ],");
    lines.push("  },");
  }
  lines.push("],");
  return lines;
}

/** Serialize the `crop` config block, emitting only fields that differ. */
export function cropLines(c: PlaygroundConfig, d: PlaygroundConfig): Lines {
  const lines: Lines = [];
  if (!eq(c.cropAspectPresets, d.cropAspectPresets))
    lines.push(`presets: ${strArr(c.cropAspectPresets)},`);
  if (!eq(c.cropResizeGroups, d.cropResizeGroups))
    lines.push(...resizePresetLines(c.cropResizeGroups));
  if (c.cropAllowCustomRatio !== d.cropAllowCustomRatio)
    lines.push(`allowCustomRatio: ${c.cropAllowCustomRatio},`);
  if (c.cropShowRotateFlip !== d.cropShowRotateFlip)
    lines.push(`showRotateFlip: ${c.cropShowRotateFlip},`);
  return lines;
}
