import { type EditxEngine, EFFECT_FILTER_NAME } from "@editx/engine";
import { createContext, useContext, useState } from "react";
import type { EditorHandle } from "../../src/image-editor";
import { ImageEditor } from "../../src/image-editor";
import { useImageEditorStore } from "../../src/store/image-editor-store";

/**
 * Test story for the custom-tool guide. Component functions (icon/panel) must
 * be defined in an importable module, not inline in the spec, so Playwright CT
 * can mount them.
 *
 * The custom "Looks" tool applies a real filter effect to the image block,
 * proving a custom tool can mutate the document — not just render inert UI.
 */

const EngineContext = createContext<EditxEngine | null>(null);

const LooksIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" />
);

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

const LooksPanel = () => {
  const engine = useContext(EngineContext);
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);

  const [applied, setApplied] = useState("");

  const applyLook = (name: string) => {
    if (!engine || editableBlockId === null) return;
    const eid = ensureFilterEffect(engine, editableBlockId);
    engine.block.setString(eid, EFFECT_FILTER_NAME, name);
    // Read back from the engine so the assertion reflects the real effect state.
    setApplied(engine.block.getString(eid, EFFECT_FILTER_NAME));
  };

  return (
    <div data-testid="looks-panel">
      <button type="button" data-testid="look-Sepia" onClick={() => applyLook("Sepia")}>
        Sepia
      </button>
      <button type="button" data-testid="look-original" onClick={() => applyLook("")}>
        Original
      </button>
      <span data-testid="applied-look">{applied}</span>
    </div>
  );
};

export const CustomToolHarness = () => {
  const [engine, setEngine] = useState<EditxEngine | null>(null);

  return (
    <EngineContext.Provider value={engine}>
      <ImageEditor
        src="/fixtures/test-image-100x100.png"
        width="900px"
        height="600px"
        onReady={(handle: EditorHandle) => setEngine(handle.engine)}
        config={{
          customTools: [{ id: "looks", label: "Looks", icon: LooksIcon, panel: LooksPanel }],
        }}
      />
    </EngineContext.Provider>
  );
};
