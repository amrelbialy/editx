import { type EditorHandle, ImageEditor } from "@editx/image-editor";
import { useRef, useState } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

/**
 * Live demo for the save-load-scene guide: captures the imperative
 * `EditorHandle` from `onReady`, then saves the scene to state and restores it
 * on demand so readers can watch the round-trip work.
 */
export function GuideSceneIo() {
  const handleRef = useRef<EditorHandle | null>(null);

  const [dark] = useDarkMode();

  const [saved, setSaved] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const onSave = () => {
    const handle = handleRef.current;
    if (!handle) return;
    const json = handle.saveScene();
    setSaved(json);
    setStatus(`Saved ${(json.length / 1024).toFixed(1)} KB — add or move blocks, then Restore.`);
  };

  const onRestore = async () => {
    const handle = handleRef.current;
    if (!handle || !saved) return;
    await handle.loadScene(saved);
    setStatus("Restored the saved scene.");
  };

  return (
    <div className="not-prose my-6">
      <div
        className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
        style={{ height: 520 }}
      >
        <ImageEditor
          src={SAMPLE_IMAGE}
          width="100%"
          height="100%"
          config={{
            theme: { preset: dark ? "dark" : "light" },
            ui: { unsavedChangesWarning: false },
          }}
          onReady={(handle) => {
            handleRef.current = handle;
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 p-3">
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Save scene
        </button>
        <button
          type="button"
          onClick={onRestore}
          disabled={!saved}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Restore scene
        </button>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {status || "Save the scene, edit the canvas, then restore it."}
        </span>
      </div>
    </div>
  );
}
