import type { BlockData } from "../block/block.types";
import { EditxEngine } from "../editx-engine";

export interface DocumentFixture {
  kind: string;
  schemaVersion: number;
  id: string;
  metadata: Record<string, unknown>;
  scene: { rootSceneId: number | null; blocks: BlockData[] };
}

export async function documentFixture() {
  const engine = new EditxEngine();
  await engine.scene.create();
  const scene = engine.scene.getScene()!;
  const page = engine.scene.getCurrentPage()!;
  const graphic = engine.block.addShape(page, "rect", "color", 0, 0, 100, 100);
  const text = engine.block.addText(page, 0, 100, 100, 40, "Editable");
  const effect = engine.block.createEffect("adjustments");
  engine.block.appendEffect(graphic, effect);
  const shape = engine.block.getShape(graphic)!;
  const fill = engine.block.getFill(graphic)!;
  const document: DocumentFixture = JSON.parse(engine.document.saveToString());
  const block = (id: number) => document.scene.blocks.find((item) => item.id === id)!;
  return { engine, document, block, ids: { scene, page, graphic, text, shape, fill, effect } };
}
