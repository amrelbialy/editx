# Add a Custom Tool

Add your own tool to the sidebar with `config.customTools`. Each tool needs an
`id`, a `label`, an `icon` component, and an optional `panel` component that is
rendered when the tool is active.

```tsx
import { ImageEditor } from "@editx/image-editor";

const LooksIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" />
);
const LooksPanel = () => <div>Pick a look</div>;

<ImageEditor
  src="/photo.jpg"
  config={{
    customTools: [
      { id: "looks", label: "Looks", icon: LooksIcon, panel: LooksPanel },
    ],
  }}
/>;
```

Panel and contextual-bar components receive no props — read editor state through
the exported hooks (`useConfig`, `useImageEditorStore`).

## Affect the image from a custom tool

A custom tool can mutate the document, not just render UI. Get the engine from the
`onReady` handle, share it with your panel (e.g. via React context), then apply an
effect through the engine's command system so it stays undoable and is baked into
the export. This mirrors the built-in filter tool:

```tsx
import { EFFECT_FILTER_NAME } from "@editx/engine";
import { useImageEditorStore } from "@editx/image-editor";

function applyLook(engine, blockId, name) {
  let eid = engine.block.getEffects(blockId).find((id) => engine.block.getKind(id) === "filter");
  if (eid == null) {
    engine.beginSilent();
    eid = engine.block.createEffect("filter");
    engine.block.appendEffect(blockId, eid);
    engine.endSilent();
  }
  engine.block.setString(eid, EFFECT_FILTER_NAME, name); // "" clears the look
}

const LooksPanel = () => {
  const engine = useContext(EngineContext); // captured from onReady
  const blockId = useImageEditorStore((s) => s.editableBlockId);
  return (
    <button
      type="button"
      onClick={() => engine && blockId != null && applyLook(engine, blockId, "Sepia")}
    >
      Apply Sepia
    </button>
  );
};
```

**Verified by:** [tests/guides/custom-tool.spec.tsx](../../tests/guides/custom-tool.spec.tsx)
— asserts the custom tool button appears, its panel renders, and selecting a look
writes a filter effect to the image block.
