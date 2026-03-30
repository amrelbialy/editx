import type { ImageEditorConfig, ThemeConfig } from "@editx/image-editor";
import { ChevronDown, ChevronUp, Code2, RotateCcw, Settings2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";
import { demoPresets } from "../theme/presets";
import type { PlaygroundConfig } from "./playground/playground.types";
import { PlaygroundCodeOutput } from "./playground/playground-code-output";
import { PlaygroundEditor } from "./playground/playground-editor";
import { PlaygroundOptions } from "./playground/playground-options";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

const DEFAULT_CONFIG: PlaygroundConfig = {
  theme: "dark",
  tools: ["crop", "adjust", "filter", "text", "shapes", "image"],
  exportFormat: "png",
  exportQuality: 0.92,
  showTitle: true,
  unsavedChangesWarning: true,
};

export function EditorPlayground() {
  const [dark] = useDarkMode();

  const [config, setConfig] = useState<PlaygroundConfig>(() => ({
    ...DEFAULT_CONFIG,
    theme: dark ? "dark" : "light",
  }));
  const [imageSrc, setImageSrc] = useState<string | File>(SAMPLE_IMAGE);
  const [codeOpen, setCodeOpen] = useState(false);

  const updateConfig = useCallback(
    <K extends keyof PlaygroundConfig>(key: K, value: PlaygroundConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const themeConfig = useMemo((): ThemeConfig => {
    const { theme } = config;
    if (theme === "dark" || theme === "light") return { preset: theme };
    const colors = demoPresets[theme];
    return colors ? { preset: "custom", colors } : { preset: "dark" };
  }, [config]);

  const editorConfig = useMemo(
    () => ({
      tools: config.tools as ImageEditorConfig["tools"],
      theme: themeConfig,
      export: {
        defaultFormat: config.exportFormat,
        quality: config.exportQuality,
      },
      ui: {
        showTitle: config.showTitle,
        unsavedChangesWarning: config.unsavedChangesWarning,
      },
    }),
    [config, themeConfig],
  );

  const handleSave = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edited.${blob.type.split("/")[1] || "png"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleReset = useCallback(() => {
    setConfig({ ...DEFAULT_CONFIG, theme: dark ? "dark" : "light" });
    setImageSrc(SAMPLE_IMAGE);
  }, [dark]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-white dark:bg-zinc-950">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <PlaygroundEditor src={imageSrc} config={editorConfig} onSave={handleSave} />
        </div>

        <div className="flex w-80 shrink-0 flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <Settings2 className="size-3.5 text-zinc-400 dark:text-zinc-500" />
              Configuration
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PlaygroundOptions
              config={config}
              onConfigChange={updateConfig}
              onImageChange={setImageSrc}
            />
          </div>
        </div>
      </div>

      {/* Collapsible code panel */}
      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setCodeOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
          style={codeOpen ? {} : { background: "linear-gradient(145deg, #0c0c1d, #111118)" }}
        >
          <span
            className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${codeOpen ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-500"}`}
          >
            <Code2 className="size-3.5" />
            Generated Code
          </span>
          {codeOpen ? (
            <ChevronDown className="size-4 text-zinc-400" />
          ) : (
            <ChevronUp className="size-4 text-zinc-500" />
          )}
        </button>
        {codeOpen && <PlaygroundCodeOutput config={config} />}
      </div>
    </div>
  );
}
