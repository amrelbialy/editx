import type { DocumentChangedEvent } from "../document-change";
import { EditxEngine } from "../editx-engine";
import type { RendererAdapter } from "../render-adapter";

export async function documentChangeFixture(renderer?: RendererAdapter) {
  const engine = new EditxEngine({ renderer });
  await engine.scene.create();
  const root = engine.scene.getScene()!;
  const first = engine.scene.getCurrentPage()!;
  const second = engine.scene.addPage();
  const x = engine.block.addText(first, 0, 0, 100, 30, "One");
  const y = engine.block.addText(second, 0, 0, 100, 30, "Two");
  const z = engine.block.addText(first, 0, 0, 100, 30, "Three");
  engine.clearHistory();
  return { engine, root, first, second, x, y, z };
}

export function collectDocumentChanges(engine: EditxEngine): DocumentChangedEvent[] {
  const events: DocumentChangedEvent[] = [];
  engine.document.onChanged((event) => events.push(event));
  return events;
}
