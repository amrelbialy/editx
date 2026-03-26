import { Image, ImageUp, User } from "lucide-react";
import { demoPresets } from "../../theme/presets";
import type { PlaygroundConfig } from "./playground.types";
import { ThemeSwatch } from "./theme-swatch";

const ALL_TOOLS = ["crop", "adjust", "filter", "text", "shapes", "image"] as const;

const ALL_PRESETS = ["dark", "light", ...Object.keys(demoPresets)] as const;

interface Props {
  config: PlaygroundConfig;
  onConfigChange: <K extends keyof PlaygroundConfig>(key: K, value: PlaygroundConfig[K]) => void;
  onImageChange: (src: string | File) => void;
}

/* ── Tiny inline primitives ──────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
      {children}
    </span>
  );
}

function OptionRow(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex cursor-pointer items-center justify-between py-1.5 text-xs text-zinc-700 dark:text-zinc-300">
      <span>{props.label}</span>
      {props.children}
    </div>
  );
}

function Toggle(props: { checked: boolean; onChange: (v: boolean) => void }) {
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

function ImageButton(props: { icon: React.ElementType; label: string; onClick: () => void }) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 transition-colors hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20"
    >
      <Icon className="size-3.5 text-zinc-400 dark:text-zinc-500" />
      {props.label}
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────── */

export function PlaygroundOptions(props: Props) {
  const { config, onConfigChange, onImageChange } = props;

  const handleToolToggle = (tool: string) => {
    const next = config.tools.includes(tool)
      ? config.tools.filter((t) => t !== tool)
      : [...config.tools, tool];
    onConfigChange("tools", next);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImageChange(file);
  };

  return (
    <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
      {/* Image Source */}
      <div className="flex flex-col gap-2.5 px-4 py-4">
        <SectionLabel>Image Source</SectionLabel>
        <div className="flex flex-col gap-1.5">
          <ImageButton
            icon={Image}
            label="Sample Landscape"
            onClick={() =>
              onImageChange(
                "https://images.unsplash.com/photo-1470071459604-3b5ab0b2c088?w=2000&q=90",
              )
            }
          />
          <ImageButton
            icon={User}
            label="Sample Portrait"
            onClick={() =>
              onImageChange(
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1600&q=90",
              )
            }
          />
          <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 transition-colors hover:border-violet-400 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400">
            <ImageUp className="size-3.5" />
            Upload your own
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Theme */}
      <div className="flex flex-col gap-2.5 px-4 py-4">
        <SectionLabel>Theme</SectionLabel>
        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
          {ALL_PRESETS.map((name) => {
            const colors =
              name === "dark"
                ? {
                    background: "#09090b",
                    foreground: "#fafafa",
                    primary: "#7c3aed",
                    card: "#18181b",
                  }
                : name === "light"
                  ? {
                      background: "#ffffff",
                      foreground: "#09090b",
                      primary: "#7c3aed",
                      card: "#ffffff",
                    }
                  : (demoPresets[name] ?? {});
            return (
              <ThemeSwatch
                key={name}
                name={name}
                colors={colors}
                active={config.theme === name}
                onClick={() => onConfigChange("theme", name)}
              />
            );
          })}
        </div>
      </div>

      {/* Tools */}
      <div className="flex flex-col gap-1 px-4 py-4">
        <SectionLabel>Tools</SectionLabel>
        {ALL_TOOLS.map((tool) => (
          <OptionRow key={tool} label={tool.charAt(0).toUpperCase() + tool.slice(1)}>
            <Toggle checked={config.tools.includes(tool)} onChange={() => handleToolToggle(tool)} />
          </OptionRow>
        ))}
      </div>

      {/* Export */}
      <div className="flex flex-col gap-2.5 px-4 py-4">
        <SectionLabel>Export</SectionLabel>
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Format</span>
          <div className="flex gap-1">
            {(["png", "jpeg", "webp"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => onConfigChange("exportFormat", fmt)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  config.exportFormat === fmt
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Quality</span>
            <span className="tabular-nums text-zinc-700 dark:text-zinc-300 font-medium">
              {Math.round(config.exportQuality * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={1}
            value={Math.round(config.exportQuality * 100)}
            onChange={(e) => onConfigChange("exportQuality", Number(e.target.value) / 100)}
            className="playground-slider w-full"
            style={{
              background: `linear-gradient(to right, #7c3aed ${((Math.round(config.exportQuality * 100) - 10) / 90) * 100}%, var(--slider-track, #e4e4e7) ${((Math.round(config.exportQuality * 100) - 10) / 90) * 100}%)`,
            }}
          />
        </div>
      </div>

      {/* UI Options */}
      <div className="flex flex-col gap-1 px-4 py-4">
        <SectionLabel>UI Options</SectionLabel>
        <OptionRow label="Show Title">
          <Toggle checked={config.showTitle} onChange={(v) => onConfigChange("showTitle", v)} />
        </OptionRow>
        <OptionRow label="Unsaved Changes Warning">
          <Toggle
            checked={config.unsavedChangesWarning}
            onChange={(v) => onConfigChange("unsavedChangesWarning", v)}
          />
        </OptionRow>
      </div>
    </div>
  );
}
