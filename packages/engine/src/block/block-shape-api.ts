import {
  AppendChildCommand,
  CreateBlockCommand,
  CreateFillCommand,
  CreateShapeCommand,
  SetFillCommand,
  SetKindCommand,
  SetShapeCommand,
} from "../controller/commands";
import type { EngineCore } from "../engine-core";
import type { FillType, ShapeType } from "./block.types";
import * as H from "./block-api-helpers";
import { SHAPE_POLYGON_SIDES, STROKE_COLOR, STROKE_ENABLED, STROKE_WIDTH } from "./property-keys";

/** Shape sub-block CRUD and shape placement convenience. */
export class BlockShapeAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  createShape(type: ShapeType): number {
    const store = this.#engine.getBlockStore();
    const cmd = new CreateShapeCommand(store, type);
    this.#engine.exec(cmd);
    return cmd.getCreatedId()!;
  }

  setShape(blockId: number, shapeId: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetShapeCommand(store, blockId, shapeId));
  }

  getShape(blockId: number): number | null {
    return this.#engine.getBlockStore().getShape(blockId);
  }

  supportsShape(blockId: number): boolean {
    return this.#engine.getBlockStore().supportsShape(blockId);
  }

  hasShape(blockId: number): boolean {
    return this.getShape(blockId) != null;
  }

  /**
   * Creates a graphic block with shape + fill sub-blocks, places it at (x, y)
   * with the given size, and appends it to the parent. Single undo step.
   */
  addShape(
    parentId: number,
    shapeKind: ShapeType,
    fillKind: FillType,
    x: number,
    y: number,
    width: number,
    height: number,
    opts?: { sides?: number },
  ): number {
    const store = this.#engine.getBlockStore();
    this.#engine.beginBatch();

    const createCmd = new CreateBlockCommand(store, "graphic");
    this.#engine.exec(createCmd);
    const graphicId = createCmd.getCreatedId()!;

    this.#engine.exec(new SetKindCommand(store, graphicId, shapeKind));
    H.setFloat(this.#engine, graphicId, "transform/position/x", x);
    H.setFloat(this.#engine, graphicId, "transform/position/y", y);
    H.setFloat(this.#engine, graphicId, "transform/size/width", width);
    H.setFloat(this.#engine, graphicId, "transform/size/height", height);

    const shapeCmd = new CreateShapeCommand(store, shapeKind);
    this.#engine.exec(shapeCmd);
    const shapeId = shapeCmd.getCreatedId()!;
    this.#engine.exec(new SetShapeCommand(store, graphicId, shapeId));

    if (opts?.sides != null && shapeKind === "polygon") {
      H.setFloat(this.#engine, shapeId, SHAPE_POLYGON_SIDES, opts.sides);
    }

    const fillCmd = new CreateFillCommand(store, fillKind);
    this.#engine.exec(fillCmd);
    const fillId = fillCmd.getCreatedId()!;
    this.#engine.exec(new SetFillCommand(store, graphicId, fillId));

    if (shapeKind === "line") {
      H.setBool(this.#engine, graphicId, STROKE_ENABLED, true);
      H.setFloat(this.#engine, graphicId, STROKE_WIDTH, 10);
      H.setColor(this.#engine, graphicId, STROKE_COLOR, { r: 0.29, g: 0.56, b: 0.89, a: 1 });
    }

    this.#engine.exec(new AppendChildCommand(store, parentId, graphicId));
    this.#engine.endBatch();
    return graphicId;
  }
}
