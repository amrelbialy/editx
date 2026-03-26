import type { EngineCore } from "../engine-core";
import type { Color, PropertyValue } from "./block.types";
import * as H from "./block-api-helpers";

/** Generic property CRUD on blocks — getFloat/setFloat, getString/setString, etc. */
export class BlockPropertyAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  getProperty(id: number, key: string): PropertyValue | undefined {
    return H.getProperty(this.#engine, id, key);
  }

  getFloat(id: number, key: string): number {
    return H.getFloat(this.#engine, id, key);
  }

  getString(id: number, key: string): string {
    return H.getString(this.#engine, id, key);
  }

  getBool(id: number, key: string): boolean {
    return H.getBool(this.#engine, id, key);
  }

  getColor(id: number, key: string): Color {
    return H.getColor(this.#engine, id, key);
  }

  setProperty(id: number, key: string, value: PropertyValue): void {
    H.setProperty(this.#engine, id, key, value);
  }

  setFloat(id: number, key: string, value: number): void {
    H.setFloat(this.#engine, id, key, value);
  }

  setString(id: number, key: string, value: string): void {
    H.setString(this.#engine, id, key, value);
  }

  setBool(id: number, key: string, value: boolean): void {
    H.setBool(this.#engine, id, key, value);
  }

  setColor(id: number, key: string, value: Color): void {
    H.setColor(this.#engine, id, key, value);
  }

  findAllProperties(id: number): string[] {
    return this.#engine.getBlockStore().findAllProperties(id);
  }
}
