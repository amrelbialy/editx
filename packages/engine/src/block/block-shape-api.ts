import {
  AppendChildCommand,
  CreateBlockCommand,
  CreateFillCommand,
  CreateShapeCommand,
  DestroyBlockCommand,
  SetFillCommand,
  SetKindCommand,
  SetNameCommand,
  SetShapeCommand,
} from "../controller/commands";
import type { EngineCore } from "../engine-core";
import type { FillType, PathViewBox, ShapeGeometry, ShapeType } from "./block.types";
import * as H from "./block-api-helpers";
import {
  SHAPE_LINE_POINTER_LENGTH,
  SHAPE_LINE_POINTER_WIDTH,
  SHAPE_PATH_DATA,
  SHAPE_PATH_VIEWBOX_HEIGHT,
  SHAPE_PATH_VIEWBOX_WIDTH,
  SHAPE_POLYGON_SIDES,
  SHAPE_RECT_CORNER_RADIUS,
  SHAPE_STAR_INNER_DIAMETER,
  SHAPE_STAR_POINTS,
  STROKE_COLOR,
  STROKE_ENABLED,
  STROKE_WIDTH,
} from "./property-keys";
import type { NormalizedShapeGeometry } from "./shape-geometry-validation";
import { normalizeShapeGeometry } from "./shape-geometry-validation";
import { validateSvgPathData } from "./svg-path-validation";

/** Shape sub-block CRUD and shape placement convenience. */
export class BlockShapeAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  createShape(type: ShapeType): number {
    const store = this.#engine._getBlockStore();
    const cmd = new CreateShapeCommand(store, type);
    this.#engine.exec(cmd);
    return cmd.getCreatedId()!;
  }

  setShape(blockId: number, shapeId: number): void {
    const store = this.#engine._getBlockStore();
    this.#engine.exec(new SetShapeCommand(store, blockId, shapeId));
  }

  getShape(blockId: number): number | null {
    return this.#engine._getBlockStore().getShape(blockId);
  }

  supportsShape(blockId: number): boolean {
    return this.#engine._getBlockStore().supportsShape(blockId);
  }

  hasShape(blockId: number): boolean {
    return this.getShape(blockId) != null;
  }

  setShapeGeometry(blockId: number, geometry: ShapeGeometry): void {
    const normalized = normalizeShapeGeometry(geometry);
    const store = this.#engine._getBlockStore();
    if (!store.get(blockId) || !store.supportsShape(blockId)) return;

    const oldShapeId = store.getShape(blockId);
    this.#engine.beginBatch();
    const createCommand = new CreateShapeCommand(store, normalized.type);
    this.#engine.exec(createCommand);
    const shapeId = createCommand.getCreatedId()!;
    this.#writeGeometry(shapeId, normalized);
    this.#engine.exec(new SetShapeCommand(store, blockId, shapeId));
    this.#engine.exec(new SetKindCommand(store, blockId, normalized.type));
    if (oldShapeId != null) this.#engine.exec(new DestroyBlockCommand(store, oldShapeId));
    this.#engine.endBatch();
  }

  #writeGeometry(shapeId: number, geometry: NormalizedShapeGeometry): void {
    switch (geometry.type) {
      case "rect":
        H.setFloat(this.#engine, shapeId, SHAPE_RECT_CORNER_RADIUS, geometry.cornerRadius);
        break;
      case "polygon":
        H.setFloat(this.#engine, shapeId, SHAPE_POLYGON_SIDES, geometry.sides);
        break;
      case "star":
        H.setFloat(this.#engine, shapeId, SHAPE_STAR_POINTS, geometry.points);
        H.setFloat(this.#engine, shapeId, SHAPE_STAR_INNER_DIAMETER, geometry.innerDiameter);
        break;
      case "line":
        H.setFloat(this.#engine, shapeId, SHAPE_LINE_POINTER_LENGTH, geometry.pointerLength);
        H.setFloat(this.#engine, shapeId, SHAPE_LINE_POINTER_WIDTH, geometry.pointerWidth);
        break;
      case "path":
        this.#engine.exec(
          new SetNameCommand(this.#engine._getBlockStore(), shapeId, geometry.name),
        );
        H.setString(this.#engine, shapeId, SHAPE_PATH_DATA, geometry.pathData);
        H.setFloat(this.#engine, shapeId, SHAPE_PATH_VIEWBOX_WIDTH, geometry.viewBox.width);
        H.setFloat(this.#engine, shapeId, SHAPE_PATH_VIEWBOX_HEIGHT, geometry.viewBox.height);
        break;
    }
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
    opts?: { sides?: number; pathData?: string; viewBox?: PathViewBox },
  ): number {
    const store = this.#engine._getBlockStore();

    // Validate the `d` string up front (single write boundary, fail-fast) so a
    // rejection throws before any batch/command is opened — no partial undo.
    const pathData = shapeKind === "path" ? validateSvgPathData(opts?.pathData ?? "") : undefined;

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

    if (shapeKind === "path") {
      H.setString(this.#engine, shapeId, SHAPE_PATH_DATA, pathData ?? "");
      if (opts?.viewBox) {
        H.setFloat(this.#engine, shapeId, SHAPE_PATH_VIEWBOX_WIDTH, opts.viewBox.width);
        H.setFloat(this.#engine, shapeId, SHAPE_PATH_VIEWBOX_HEIGHT, opts.viewBox.height);
      }
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
