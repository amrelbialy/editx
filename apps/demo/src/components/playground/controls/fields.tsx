import { FieldLabel } from "./primitives";

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Formats the value shown on the right (e.g. `92%`). */
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

export function RangeSlider(props: RangeSliderProps) {
  const { label, value, min, max, step = 1, format, onChange } = props;
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="tabular-nums text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="playground-slider w-full"
        style={{
          background: `linear-gradient(to right, #7c3aed ${pct}%, var(--slider-track, #e4e4e7) ${pct}%)`,
        }}
      />
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}

export function NumberField(props: NumberFieldProps) {
  const { label, value, min, max, step, suffix, onChange } = props;
  return (
    <label className="flex items-center justify-between gap-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-right text-xs text-zinc-700 tabular-nums outline-none transition-colors focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300"
        />
        {suffix && <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{suffix}</span>}
      </div>
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}

export function TextField(props: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <FieldLabel>{props.label}</FieldLabel>
      <input
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-700 outline-none transition-colors focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300"
      />
    </label>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly { label: string; value: T }[];
  onChange: (v: T) => void;
}

export function SelectField<T extends string>(props: SelectFieldProps<T>) {
  return (
    <label className="flex items-center justify-between gap-2">
      <FieldLabel>{props.label}</FieldLabel>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
        className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 outline-none transition-colors focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300"
      >
        {props.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
