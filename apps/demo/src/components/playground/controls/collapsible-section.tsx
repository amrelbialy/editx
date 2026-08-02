import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface CollapsibleSectionProps {
  icon: React.ElementType;
  title: string;
  /** Number of options changed from default — shown as an accent badge. */
  activeCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection(props: CollapsibleSectionProps) {
  const { icon: Icon, title, activeCount = 0, defaultOpen = false, children } = props;

  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
      >
        <Icon className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
        <span className="flex-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {title}
        </span>
        {activeCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-100 px-1 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={`size-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>}
    </div>
  );
}
