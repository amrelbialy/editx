import { type EditxEngine, EFFECT_FILTER_NAME } from "@editx/engine";
import { type EditorHandle, ImageEditor, useImageEditorStore } from "@editx/image-editor";
import { createContext, useContext, useMemo, useState } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

/** Shares the live engine (from `onReady`) with the custom tool panel below. */
const EngineContext = createContext<EditxEngine | null>(null);

/** A few visually distinct built-in filter presets. `""` clears the effect. */
const LOOKS: Array<{ name: string; label: string }> = [
  { name: "", label: "Original" },
  { name: "BlackAndWhite", label: "B & W" },
  { name: "Sepia", label: "Sepia" },
  { name: "Invert", label: "Invert" },
  { name: "1977", label: "1977" },
];

/**
 * Ensure the block has a single `filter` effect and return its id — mirrors the
 * editor's built-in filter tool so the change is undoable and lands on export.
 */
function ensureFilterEffect(engine: EditxEngine, blockId: number): number {
  for (const eid of engine.block.getEffects(blockId)) {
    if (engine.block.getKind(eid) === "filter") return eid;
  }
  engine.beginSilent();
  const eid = engine.block.createEffect("filter");
  engine.block.appendEffect(blockId, eid);
  engine.endSilent();
  return eid;
}

const LooksIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="13.5" cy="6.5" r="2.5" />
    <circle cx="19" cy="13" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="10" cy="20" r="2.5" />
    <path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2 2 2 0 0 1 2-2h1a4 4 0 0 0 4-4 10 10 0 0 0-10-10Z" />
  </svg>
);

/**
 * Custom tool panel. It reaches the engine through {@link EngineContext} and the
 * target block through the exported `useImageEditorStore`, then writes a filter
 * effect — so clicking a look visibly changes the image on the canvas.
 */
const LooksPanel = () => {
  const engine = useContext(EngineContext);
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);

  const [active, setActive] = useState("");

  const applyLook = (name: string) => {
    if (!engine || editableBlockId === null) return;
    const eid = ensureFilterEffect(engine, editableBlockId);
    engine.block.setString(eid, EFFECT_FILTER_NAME, name);
    setActive(name);
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Pick a look — it writes a filter effect to the image.
      </p>
      {LOOKS.map((look) => {
        const isActive = active === look.name;
        return (
          <button
            key={look.name || "original"}
            type="button"
            data-testid={`look-${look.name || "original"}`}
            aria-pressed={isActive}
            onClick={() => applyLook(look.name)}
            disabled={!engine || editableBlockId === null}
            className={`h-8 rounded-md border px-2 text-left text-sm transition-colors disabled:opacity-50 ${
              isActive
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            {look.label}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Live demo for the custom-tool guide: registers a "Looks" tool whose panel
 * applies real filter effects to the sample image, proving a custom tool can
 * mutate the document — not just render inert UI.
 */
export function GuideCustomTool() {
  const [dark] = useDarkMode();

  const [engine, setEngine] = useState<EditxEngine | null>(null);

  const config = useMemo(
    () => ({
      theme: { preset: dark ? ("dark" as const) : ("light" as const) },
      ui: { unsavedChangesWarning: false },
      customTools: [{ id: "looks", label: "Looks", icon: LooksIcon, panel: LooksPanel }],
    }),
    [dark],
  );

  return (
    <div className="not-prose my-6">
      <div
        className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
        style={{ height: 520 }}
      >
        <EngineContext.Provider value={engine}>
          <ImageEditor
            src={SAMPLE_IMAGE}
            width="100%"
            height="100%"
            config={config}
            onReady={(handle: EditorHandle) => setEngine(handle.engine)}
          />
        </EngineContext.Provider>
      </div>
    </div>
  );
}
