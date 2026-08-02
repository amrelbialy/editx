import { Check } from "lucide-react";

interface CheckListProps<T extends string> {
  options: readonly { label: string; value: T }[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  /** Chip layout (default) or a stacked full-width list. */
  variant?: "chips" | "list";
}

export function CheckList<T extends string>(props: CheckListProps<T>) {
  const { options, selected, onToggle, variant = "chips" } = props;

  if (variant === "list") {
    return (
      <div className="flex flex-col gap-1">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                active
                  ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {opt.label}
              {active && <Check className="size-3.5" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              active
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-zinc-200 bg-transparent text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
