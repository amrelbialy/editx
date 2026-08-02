import { Plus, X } from "lucide-react";

interface ColorListProps {
  colors: string[];
  onChange: (colors: string[]) => void;
}

/** Editable swatch palette — add via native color input, remove via hover ✕. */
export function ColorList(props: ColorListProps) {
  const { colors, onChange } = props;

  const setAt = (index: number, value: string) =>
    onChange(colors.map((c, i) => (i === index ? value : c)));

  const removeAt = (index: number) => onChange(colors.filter((_, i) => i !== index));

  const add = () => onChange([...colors, "#7c3aed"]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((color, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: palette entries are positional
        <div key={index} className="group relative">
          <label
            className="block size-7 cursor-pointer rounded-md border border-zinc-200 dark:border-zinc-700"
            style={{ background: color }}
          >
            <input
              type="color"
              value={color}
              onChange={(e) => setAt(index, e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
          <button
            type="button"
            onClick={() => removeAt(index)}
            aria-label="Remove color"
            className="absolute -right-1 -top-1 hidden size-3.5 items-center justify-center rounded-full bg-zinc-700 text-white group-hover:flex hover:bg-red-600"
          >
            <X className="size-2.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        aria-label="Add color"
        className="flex size-7 items-center justify-center rounded-md border border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-violet-400 hover:text-violet-500 dark:border-zinc-600"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** Single labelled color swatch with hex text mirror. */
export function ColorField(props: ColorFieldProps) {
  const { label, value, onChange } = props;
  return (
    <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
      {label}
      <span className="flex items-center gap-1.5">
        <span className="tabular-nums text-zinc-600 dark:text-zinc-300">{value}</span>
        <span
          className="relative block size-6 rounded-md border border-zinc-200 dark:border-zinc-700"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
      </span>
    </label>
  );
}
