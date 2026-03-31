import type { EngineCore } from "./engine-core";

export class VariableAPI {
  #engine: EngineCore;
  #values = new Map<string, string>();

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  setString(name: string, value: string): void {
    this.#values.set(name, value);
    this.#engine.emit("variable:changed", name, value);
    this.#engine.renderDirty();
  }

  getString(name: string): string | undefined {
    return this.#values.get(name);
  }

  findAll(): string[] {
    return [...this.#values.keys()];
  }

  remove(name: string): void {
    this.#values.delete(name);
    this.#engine.emit("variable:changed", name, undefined);
    this.#engine.renderDirty();
  }

  /** @internal — used by renderer to resolve placeholders in text. */
  resolve(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return this.#values.get(key) ?? match;
    });
  }

  /** @internal — serialize current values for scene save. */
  _serialize(): Record<string, string> {
    return Object.fromEntries(this.#values);
  }

  /** @internal — restore values from scene load. */
  _deserialize(data: Record<string, string>): void {
    this.#values.clear();
    for (const [k, v] of Object.entries(data)) {
      this.#values.set(k, v);
    }
  }
}
