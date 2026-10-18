/** Defers observers until a transaction settles, draining rendering before host callbacks. */
export class EngineNotifications {
  #depth = 0;
  #draining = false;
  #pending = new Set<() => void>();
  #frame: (() => void) | null = null;

  begin(): void {
    this.#depth++;
  }

  end(): void {
    this.#depth--;
    this.#drain();
  }

  run<T>(operation: () => T): T {
    this.begin();
    try {
      return operation();
    } finally {
      this.end();
    }
  }

  enqueue(callback: () => void): void {
    this.#pending.add(callback);
    this.#drain();
  }

  render(callback: () => void): void {
    this.#frame = callback;
    this.#drain();
  }

  #drain(): void {
    if (this.#depth > 0 || this.#draining) return;
    this.#draining = true;
    try {
      while (this.#depth === 0 && (this.#frame || this.#pending.size > 0)) {
        if (this.#frame) {
          const frame = this.#frame;
          this.#frame = null;
          frame();
        } else {
          const callback = this.#pending.values().next().value!;
          this.#pending.delete(callback);
          callback();
        }
      }
    } finally {
      this.#draining = false;
    }
  }
}
