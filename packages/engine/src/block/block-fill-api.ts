import { CreateFillCommand, SetFillCommand } from "../controller/commands";
import type { EngineCore } from "../engine-core";
import type { Color, FillType } from "./block.types";
import * as H from "./block-api-helpers";
import { FILL_ENABLED, FILL_SOLID_COLOR } from "./property-keys";

/** Fill sub-block CRUD — create, attach, enable/disable fills on graphic blocks. */
export class BlockFillAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  createFill(type: FillType): number {
    const store = this.#engine.getBlockStore();
    const cmd = new CreateFillCommand(store, type);
    this.#engine.exec(cmd);
    return cmd.getCreatedId()!;
  }

  setFill(blockId: number, fillId: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetFillCommand(store, blockId, fillId));
  }

  getFill(blockId: number): number | null {
    return this.#engine.getBlockStore().getFill(blockId);
  }

  supportsFill(blockId: number): boolean {
    return this.#engine.getBlockStore().supportsFill(blockId);
  }

  hasFill(blockId: number): boolean {
    return this.getFill(blockId) != null;
  }

  setFillEnabled(blockId: number, enabled: boolean): void {
    H.setBool(this.#engine, blockId, FILL_ENABLED, enabled);
  }

  isFillEnabled(blockId: number): boolean {
    return H.getBool(this.#engine, blockId, FILL_ENABLED);
  }

  setFillSolidColor(blockId: number, color: Color): void {
    const fillId = this.getFill(blockId);
    if (fillId == null) return;
    H.setColor(this.#engine, fillId, FILL_SOLID_COLOR, color);
  }

  getFillSolidColor(blockId: number): Color | null {
    const fillId = this.getFill(blockId);
    if (fillId == null) return null;
    return H.getColor(this.#engine, fillId, FILL_SOLID_COLOR);
  }
}
