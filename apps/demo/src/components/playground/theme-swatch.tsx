import type { ThemePresetValues } from "@creative-editor/image-editor";

interface Props {
  name: string;
  colors: ThemePresetValues;
  active: boolean;
  onClick: () => void;
}

export function ThemeSwatch(props: Props) {
  const { name, colors, active, onClick } = props;

  const bg = colors.background ?? "#09090b";
  const fg = colors.foreground ?? "#fafafa";
  const primary = colors.primary ?? "#7c3aed";
  const card = colors.card ?? bg;

  const label = name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`group relative flex flex-col items-center gap-1.5 rounded-lg p-1.5 text-xs transition-all duration-150 ${
        active
          ? "ring-2 ring-violet-500"
          : "ring-1 ring-zinc-200 dark:ring-zinc-700 hover:ring-zinc-400 dark:hover:ring-zinc-500"
      }`}
    >
      <div
        className="flex h-10 w-full items-center gap-1.5 rounded-md px-1.5"
        style={{ background: bg }}
      >
        <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: primary }} />
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="h-1.5 w-full rounded-sm" style={{ background: fg, opacity: 0.3 }} />
          <div className="h-1.5 w-3/4 rounded-sm" style={{ background: fg, opacity: 0.15 }} />
        </div>
        <div
          className="h-4.5 w-4.5 shrink-0 rounded-sm"
          style={{ background: card, border: `1px solid ${fg}20` }}
        />
      </div>
      <span className="max-w-full truncate px-0.5 text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
    </button>
  );
}
