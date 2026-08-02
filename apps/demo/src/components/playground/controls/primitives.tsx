/* ── Small shared primitives for the playground sidebar ──────────── */

export function OptionRow(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-zinc-700 dark:text-zinc-300">
      <div className="flex flex-col">
        <span>{props.label}</span>
        {props.hint && (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{props.hint}</span>
        )}
      </div>
      {props.children}
    </div>
  );
}

export function FieldLabel(props: { children: React.ReactNode }) {
  return <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{props.children}</span>;
}

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      onClick={() => props.onChange(!props.checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
        props.checked ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
          props.checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: readonly { label: string; value: T }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>(props: SegmentedProps<T>) {
  return (
    <div className="flex gap-1">
      {props.options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => props.onChange(opt.value)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            props.value === opt.value
              ? "bg-violet-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
