import { ImageEditor, SegmentedControl } from "@editx/image-editor";
import { ArrowUpRight, Shapes, Type } from "lucide-react";
import { useMemo, useState } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1200&q=80";

const MODE_OPTIONS = [
  {
    value: "text",
    label: (
      <>
        <Type className="size-4" /> Text presets
      </>
    ),
  },
  {
    value: "shapes",
    label: (
      <>
        <Shapes className="size-4" /> Shape presets
      </>
    ),
  },
] as const;

const MODE_DETAILS = {
  text: {
    description:
      "Create with rich styles, curved lettering, highlights, and editable layered compositions.",
    guide: "/docs/image-editor/guides/configure-fonts",
    guideLabel: "Configure text presets",
  },
  shapes: {
    description: "Create with filled, outlined, gradient, image-filled, and abstract graphics.",
    guide: "/docs/image-editor/guides/configure-shapes",
    guideLabel: "Configure shape presets",
  },
} as const;

type GalleryMode = keyof typeof MODE_DETAILS;

export function PresetGalleryShowcase() {
  const [dark] = useDarkMode();

  const [mode, setMode] = useState<GalleryMode>("text");

  const config = useMemo(
    () => ({
      tools: ["text", "shapes"] as GalleryMode[],
      defaultTool: mode,
      theme: { preset: dark ? ("dark" as const) : ("light" as const) },
      export: { defaultFormat: "png" as const, quality: 0.92 },
      ui: { showTitle: true, unsavedChangesWarning: false },
    }),
    [dark, mode],
  );
  const details = MODE_DETAILS[mode];

  return (
    <div className="flex flex-col gap-5">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 text-center">
        <SegmentedControl
          options={[...MODE_OPTIONS]}
          value={mode}
          onValueChange={setMode}
          ariaLabel="Preset gallery"
          className="w-full max-w-sm border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-900 [&_[role=tab]]:text-zinc-500 dark:[&_[role=tab]]:text-zinc-400 [&_[role=tab][aria-selected=true]]:bg-white [&_[role=tab][aria-selected=true]]:text-zinc-900 dark:[&_[role=tab][aria-selected=true]]:bg-zinc-700 dark:[&_[role=tab][aria-selected=true]]:text-white"
        />
        <p className="min-h-10 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {details.description}
        </p>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_40px_-10px_rgba(0,0,0,0.16)] dark:border-zinc-800 dark:bg-zinc-950"
        style={{ height: 600 }}
      >
        <ImageEditor key={mode} src={SAMPLE_IMAGE} config={config} width="100%" height="100%" />
      </div>

      <a
        href={details.guide}
        className="mx-auto inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 no-underline hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300"
      >
        {details.guideLabel}
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </a>
    </div>
  );
}
