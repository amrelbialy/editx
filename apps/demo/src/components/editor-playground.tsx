import { downloadBlob } from "@editx/image-editor";
import { ChevronDown, ChevronUp, Code2, RotateCcw, Settings2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";
import { buildEditorConfig } from "./playground/build-editor-config";
import { DEFAULT_PLAYGROUND_CONFIG, SAMPLE_LANDSCAPE } from "./playground/playground.constants";
import type { PlaygroundConfig } from "./playground/playground.types";
import { PlaygroundCodeOutput } from "./playground/playground-code-output";
import { PlaygroundEditor } from "./playground/playground-editor";
import { PlaygroundOptions } from "./playground/playground-options";

export function EditorPlayground() {
  const [dark] = useDarkMode();

  const [config, setConfig] = useState<PlaygroundConfig>(() => ({
    ...DEFAULT_PLAYGROUND_CONFIG,
    themePreset: dark ? "dark" : "light",
  }));
  const [imageSrc, setImageSrc] = useState<string | File>(SAMPLE_LANDSCAPE);
  const [editorKey, setEditorKey] = useState(0);
  const [codeOpen, setCodeOpen] = useState(false);

  const updateConfig = useCallback(
    <K extends keyof PlaygroundConfig>(key: K, value: PlaygroundConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const editorConfig = useMemo(() => buildEditorConfig(config), [config]);

  const handleSave = useCallback(
    (blob: Blob) => {
      downloadBlob(blob, config.exportFilename || undefined);
    },
    [config.exportFilename],
  );

  const handleClose = useCallback(() => {
    setEditorKey((k) => k + 1);
  }, []);

  const handleReset = useCallback(() => {
    setConfig({ ...DEFAULT_PLAYGROUND_CONFIG, themePreset: dark ? "dark" : "light" });
    setImageSrc(SAMPLE_LANDSCAPE);
    setEditorKey((k) => k + 1);
  }, [dark]);

  const handleImageChange = useCallback((src: string | File) => {
    setImageSrc(src);
    setEditorKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-white dark:bg-zinc-950">
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="h-[50vh] shrink-0 overflow-hidden lg:h-auto lg:flex-1">
          <PlaygroundEditor
            key={editorKey}
            src={imageSrc}
            config={editorConfig}
            onSave={handleSave}
            onClose={handleClose}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-200 bg-white lg:min-h-0 lg:flex-none lg:w-80 lg:border-l lg:border-t-0 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <Settings2 className="size-3.5 text-zinc-400 dark:text-zinc-500" />
              Configuration
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PlaygroundOptions
              config={config}
              onConfigChange={updateConfig}
              onImageChange={handleImageChange}
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setCodeOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
          style={codeOpen ? {} : { background: "linear-gradient(145deg, #0c0c1d, #111118)" }}
        >
          <span
            className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${
              codeOpen ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-500"
            }`}
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
