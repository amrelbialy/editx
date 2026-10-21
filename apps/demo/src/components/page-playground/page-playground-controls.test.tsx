// @vitest-environment happy-dom
import { EditxEngine } from "@editx/engine";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PagePlaygroundControls } from "./page-playground-controls";
import { seedPagePlayground } from "./page-playground-scene";
import { type RunPlaygroundAction, readPlaygroundSnapshot } from "./use-page-observations";

afterEach(cleanup);

it("fits the post chosen from the demo list without editing the document or changing selection", async () => {
  const engine = new EditxEngine();
  await engine.scene.create({ width: 1080, height: 1080 });
  seedPagePlayground(engine);
  const before = JSON.parse(engine.scene.saveToString());
  const fit = vi.spyOn(engine.editor, "fitToScreen");
  const run: RunPlaygroundAction = async (_label, action) => {
    await action();
  };
  const view = render(
    <PagePlaygroundControls
      engine={engine}
      snapshot={readPlaygroundSnapshot(engine)}
      busy={false}
      run={run}
    />,
  );
  fireEvent.click(view.getByRole("button", { name: /^Activate Open Studio/ }));
  const activePageId = engine.scene.getPages()[1];
  expect(engine.scene.getCurrentPage()).toBe(activePageId);
  expect(fit).toHaveBeenLastCalledWith(24, true);
  expect(engine.block.findAllSelected()).toEqual([]);
  expect(engine.canUndo()).toBe(false);
  expect(JSON.parse(engine.scene.saveToString())).toEqual({ ...before, activePageId });
});
