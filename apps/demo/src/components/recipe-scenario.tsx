import type { EditorEventCallbacks, EditorSlots, ImageEditorConfig } from "@editx/image-editor";
import { ImageEditor } from "@editx/image-editor";
import { useMemo } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

interface RecipeScenarioProps {
  /** The recipe's config — rendered live on the sample image. */
  config?: ImageEditorConfig;
  slots?: EditorSlots;
  events?: EditorEventCallbacks;
  /** Box height in pixels. */
  height?: number;
}

/**
 * Renders a live, inline ImageEditor for a documentation recipe. The same
 * config shown in the recipe's code block is applied here so readers can try it
 * immediately. The recipe's own `theme` (if any) wins; otherwise the demo's
 * light/dark preset is used.
 */
export function RecipeScenario(props: RecipeScenarioProps) {
  const { config, slots, events, height = 520 } = props;

  const [dark] = useDarkMode();

  const mergedConfig = useMemo<ImageEditorConfig>(() => {
    const basePreset = dark ? ("dark" as const) : ("light" as const);
    return {
      ...config,
      theme: config?.theme ?? { preset: basePreset },
      ui: { unsavedChangesWarning: false, ...config?.ui },
    };
  }, [config, dark]);

  return (
    <div
      className="not-prose my-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
      style={{ height }}
    >
      <ImageEditor
        src={SAMPLE_IMAGE}
        config={mergedConfig}
        slots={slots}
        events={events}
        width="100%"
        height="100%"
      />
    </div>
  );
}
