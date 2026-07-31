import { type EditorHandle, ImageEditor } from "@editx/image-editor";
import { useRef, useState } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";
const SAVED_LABEL = "SAVED LOOK";
const UPDATED_LABEL = "NEW LOOK";

interface DemoBlocks {
  badgeId: number;
  accentId: number;
  textId: number;
  pageWidth: number;
  pageHeight: number;
}

function createSavedLook(handle: EditorHandle, pageId: number): DemoBlocks {
  const { width: pageWidth, height: pageHeight } = handle.engine.block.getPageDimensions(pageId);
  const unit = Math.min(pageWidth, pageHeight);
  const badgeId = handle.engine.block.addShape(
    pageId,
    "rect",
    "color",
    pageWidth * 0.08,
    pageHeight * 0.12,
    unit * 0.48,
    unit * 0.14,
  );
  handle.engine.block.setFillSolidColor(badgeId, { r: 0.15, g: 0.32, b: 0.95, a: 0.9 });

  const accentId = handle.engine.block.addShape(
    pageId,
    "ellipse",
    "color",
    pageWidth * 0.72,
    pageHeight * 0.68,
    unit * 0.16,
    unit * 0.16,
  );
  handle.engine.block.setFillSolidColor(accentId, { r: 0.98, g: 0.75, b: 0.14, a: 0.95 });

  const textId = handle.engine.block.addText(
    pageId,
    pageWidth * 0.1,
    pageHeight * 0.145,
    unit * 0.44,
    unit * 0.09,
    SAVED_LABEL,
    {
      style: {
        fill: "#ffffff",
        fontSize: unit * 0.055,
        fontWeight: "bold",
        letterSpacing: unit * 0.004,
      },
    },
  );

  return { badgeId, accentId, textId, pageWidth, pageHeight };
}

function applyUpdatedLook(handle: EditorHandle, blocks: DemoBlocks): void {
  const { badgeId, accentId, textId, pageWidth, pageHeight } = blocks;
  const unit = Math.min(pageWidth, pageHeight);

  handle.engine.block.setPosition(badgeId, pageWidth * 0.42, pageHeight * 0.67);
  handle.engine.block.setRotation(badgeId, -8);
  handle.engine.block.setFillSolidColor(badgeId, { r: 0.92, g: 0.2, b: 0.36, a: 0.9 });
  handle.engine.block.setPosition(accentId, pageWidth * 0.1, pageHeight * 0.15);
  handle.engine.block.setSize(accentId, unit * 0.24, unit * 0.24);
  handle.engine.block.setFillSolidColor(accentId, { r: 0.1, g: 0.82, b: 0.75, a: 0.95 });
  handle.engine.block.replaceText(textId, 0, SAVED_LABEL.length, UPDATED_LABEL);
  handle.engine.block.setTextStyle(textId, 0, UPDATED_LABEL.length, {
    fill: "#ffffff",
    fontSize: unit * 0.055,
    fontWeight: "bold",
    letterSpacing: unit * 0.004,
  });
  handle.engine.block.setPosition(textId, pageWidth * 0.46, pageHeight * 0.695);
  handle.engine.block.deselectAll();
  requestAnimationFrame(() => handle.engine.block.deselectAll());
}

/**
 * Live demo for the save-load-scene guide: captures the imperative
 * `EditorHandle` from `onReady`, then saves the scene to state and restores it
 * on demand so readers can watch the round-trip work.
 */
export function GuideSceneIo() {
  const handleRef = useRef<EditorHandle | null>(null);
  const demoBlocksRef = useRef<DemoBlocks | null>(null);

  const [dark] = useDarkMode();

  const [saved, setSaved] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const onSave = () => {
    const handle = handleRef.current;
    const blocks = demoBlocksRef.current;
    if (!handle || !blocks) return;
    const json = handle.saveScene();

    setSaved(json);
    applyUpdatedLook(handle, blocks);
    setStatus(
      `Saved ${(json.length / 1024).toFixed(1)} KB, then applied a new look. Restore the saved look.`,
    );
  };

  const onRestore = async () => {
    const handle = handleRef.current;
    if (!handle || !saved) return;
    await handle.loadScene(saved);
    handle.engine.block.deselectAll();
    setSaved(null);
    setStatus("Restored the original saved look.");
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
            const pageId = handle.engine.scene.getCurrentPage();
            if (pageId === null) {
              setStatus("Could not prepare the scene demo.");
              return;
            }
            demoBlocksRef.current = createSavedLook(handle, pageId);
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 p-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saved !== null}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Save & show new look
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
          {status || "Save this composition, preview a new look, then restore the original."}
        </span>
      </div>
    </div>
  );
}
