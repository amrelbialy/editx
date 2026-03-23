import {
  AppendEffectCommand,
  CreateEffectCommand,
  InsertEffectCommand,
  RemoveEffectCommand,
} from "../controller/commands";
import type { Engine } from "../engine";
import type { EffectType } from "./block.types";
import * as H from "./block-api-helpers";
import {
  EFFECT_ADJUSTMENTS_BLACKS,
  EFFECT_ADJUSTMENTS_BRIGHTNESS,
  EFFECT_ADJUSTMENTS_CLARITY,
  EFFECT_ADJUSTMENTS_CONTRAST,
  EFFECT_ADJUSTMENTS_EXPOSURE,
  EFFECT_ADJUSTMENTS_GAMMA,
  EFFECT_ADJUSTMENTS_HIGHLIGHTS,
  EFFECT_ADJUSTMENTS_SATURATION,
  EFFECT_ADJUSTMENTS_SHADOWS,
  EFFECT_ADJUSTMENTS_SHARPNESS,
  EFFECT_ADJUSTMENTS_TEMPERATURE,
  EFFECT_ADJUSTMENTS_WHITES,
  EFFECT_ENABLED,
} from "./property-keys";

/** Identifies one of the 12 adjustment parameters. */
export type AdjustmentParam =
  | "brightness"
  | "saturation"
  | "contrast"
  | "gamma"
  | "clarity"
  | "exposure"
  | "shadows"
  | "highlights"
  | "blacks"
  | "whites"
  | "temperature"
  | "sharpness";

/** Configuration for a single adjustment parameter: property key + valid range. */
export interface AdjustmentConfig {
  key: string;
  min: number;
  max: number;
  step: number;
}

/** Maps each AdjustmentParam to its effect property key and valid range. */
export const ADJUSTMENT_CONFIG: Record<AdjustmentParam, AdjustmentConfig> = {
  brightness: { key: EFFECT_ADJUSTMENTS_BRIGHTNESS, min: -1, max: 1, step: 0.05 },
  saturation: { key: EFFECT_ADJUSTMENTS_SATURATION, min: -1, max: 1, step: 0.05 },
  contrast: { key: EFFECT_ADJUSTMENTS_CONTRAST, min: -1, max: 1, step: 0.05 },
  gamma: { key: EFFECT_ADJUSTMENTS_GAMMA, min: -1, max: 1, step: 0.05 },
  clarity: { key: EFFECT_ADJUSTMENTS_CLARITY, min: -1, max: 1, step: 0.05 },
  exposure: { key: EFFECT_ADJUSTMENTS_EXPOSURE, min: -1, max: 1, step: 0.05 },
  shadows: { key: EFFECT_ADJUSTMENTS_SHADOWS, min: -1, max: 1, step: 0.05 },
  highlights: { key: EFFECT_ADJUSTMENTS_HIGHLIGHTS, min: -1, max: 1, step: 0.05 },
  blacks: { key: EFFECT_ADJUSTMENTS_BLACKS, min: -1, max: 1, step: 0.05 },
  whites: { key: EFFECT_ADJUSTMENTS_WHITES, min: -1, max: 1, step: 0.05 },
  temperature: { key: EFFECT_ADJUSTMENTS_TEMPERATURE, min: -1, max: 1, step: 0.05 },
  sharpness: { key: EFFECT_ADJUSTMENTS_SHARPNESS, min: -1, max: 1, step: 0.05 },
};

/** All adjustment param names, useful for iteration. */
export const ADJUSTMENT_PARAMS: AdjustmentParam[] = Object.keys(
  ADJUSTMENT_CONFIG,
) as AdjustmentParam[];

/** Effects CRUD — create, append, insert, remove, enable/disable effect sub-blocks. */
export class BlockEffectAPI {
  #engine: Engine;

  constructor(engine: Engine) {
    this.#engine = engine;
  }

  createEffect(type: EffectType): number {
    const store = this.#engine.getBlockStore();
    const cmd = new CreateEffectCommand(store, type);
    this.#engine.exec(cmd);
    return cmd.getCreatedId()!;
  }

  appendEffect(blockId: number, effectId: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new AppendEffectCommand(store, blockId, effectId));
  }

  insertEffect(blockId: number, effectId: number, index: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new InsertEffectCommand(store, blockId, effectId, index));
  }

  removeEffect(blockId: number, index: number): number | null {
    const store = this.#engine.getBlockStore();
    const cmd = new RemoveEffectCommand(store, blockId, index);
    this.#engine.exec(cmd);
    return cmd.getRemovedEffectId();
  }

  getEffects(blockId: number): number[] {
    return this.#engine.getBlockStore().getEffects(blockId);
  }

  supportsEffects(blockId: number): boolean {
    const type = this.#engine.getBlockStore().getType(blockId);
    return type === "page" || type === "image" || type === "graphic";
  }

  hasEffects(blockId: number): boolean {
    return this.#engine.getBlockStore().getEffects(blockId).length > 0;
  }

  setEffectEnabled(effectId: number, enabled: boolean): void {
    H.setBool(this.#engine, effectId, EFFECT_ENABLED, enabled);
  }

  isEffectEnabled(effectId: number): boolean {
    return H.getBool(this.#engine, effectId, EFFECT_ENABLED);
  }
}
