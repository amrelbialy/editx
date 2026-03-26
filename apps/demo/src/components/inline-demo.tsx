import { ImageEditor } from "@creative-editor/image-editor";
import { useMemo } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

const TOOLS = ["crop", "adjust", "filter", "text", "shapes", "image"] as (
  | "crop"
  | "adjust"
  | "filter"
  | "text"
  | "shapes"
  | "image"
)[];

export function InlineDemo() {
  const [dark] = useDarkMode();

  const config = useMemo(
    () => ({
      tools: TOOLS,
      theme: { preset: dark ? ("dark" as const) : ("light" as const) },
      export: { defaultFormat: "png" as const, quality: 0.92 },
      ui: { showTitle: true, unsavedChangesWarning: false },
    }),
    [dark],
  );

  return (
    <div
      className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-[0_8px_40px_-10px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.03)]"
      style={{ height: 600 }}
    >
      <ImageEditor src={SAMPLE_IMAGE} config={config} width="100%" height="100%" />
    </div>
  );
}
