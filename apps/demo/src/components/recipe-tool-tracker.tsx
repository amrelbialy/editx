import { ImageEditor } from "@editx/image-editor";
import { useState } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

/**
 * Live demo for the track-tool-changes recipe: renders the editor with an
 * `events.onToolChange` callback and shows the most recent tool id below it.
 */
export function RecipeToolTracker() {
  const [dark] = useDarkMode();

  const [lastTool, setLastTool] = useState<string>("none");

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
          events={{ onToolChange: (toolId) => setLastTool(toolId ?? "none") }}
        />
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Last <code>onToolChange</code> value:{" "}
        <strong className="text-zinc-900 dark:text-zinc-100">{lastTool}</strong>
      </p>
    </div>
  );
}
