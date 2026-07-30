import { ImageEditor } from "@editx/image-editor";
import { useState } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

interface LogEntry {
  id: number;
  event: string;
  detail: string;
}

const EVENT_COLORS: Record<string, string> = {
  onToolChange: "text-violet-600 dark:text-violet-400",
  onBeforeSave: "text-amber-600 dark:text-amber-400",
  onSave: "text-emerald-600 dark:text-emerald-400",
};

/**
 * Live demo for the track-tool-changes guide: wires every editor event to a
 * running log so readers can watch `onToolChange`, `onBeforeSave`, and `onSave`
 * fire as they interact with and export from the editor.
 */
export function GuideToolTracker() {
  const [dark] = useDarkMode();

  const [log, setLog] = useState<LogEntry[]>([]);

  const push = (event: string, detail: string) =>
    setLog((prev) => [{ id: prev.length + 1, event, detail }, ...prev].slice(0, 8));

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
          onSave={(blob) => push("onSave", `${blob.type} · ${(blob.size / 1024).toFixed(1)} KB`)}
          events={{
            onToolChange: (toolId) => push("onToolChange", toolId ?? "null (deselected)"),
            onBeforeSave: (blob) => {
              push("onBeforeSave", `${(blob.size / 1024).toFixed(1)} KB → passthrough`);
              return undefined;
            },
          }}
        />
      </div>

      <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Event log — switch tools, then Export
        </p>
        {log.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No events yet. Pick a tool or export to see callbacks fire.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 font-mono text-xs">
            {log.map((entry) => (
              <li key={entry.id} className="flex items-baseline gap-2">
                <span className={`font-semibold ${EVENT_COLORS[entry.event] ?? ""}`}>
                  {entry.event}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">{entry.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
