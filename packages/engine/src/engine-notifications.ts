/** Defers observers until a transaction settles, draining rendering before host callbacks. */
export class EngineNotifications {
  #depth = 0;
  #draining = false;
  #pending = new Set<() => void>();
  #settlements = new Set<() => void>();
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

  settle(callback: () => void): void {
    this.#settlements.add(callback);
    this.#drain();
  }

  #drain(): void {
    if (this.#depth > 0 || this.#draining) return;
    this.#draining = true;
    let renderFailed = false;
    let renderError: unknown;
    try {
      while (
        this.#depth === 0 &&
        (this.#frame || this.#settlements.size > 0 || this.#pending.size > 0)
      ) {
        if (this.#frame) {
          const frame = this.#frame;
          this.#frame = null;
          if (!renderFailed) {
            try {
              frame();
            } catch (error) {
              renderFailed = true;
              renderError = error;
            }
          }
        } else {
          const queue = this.#settlements.size > 0 ? this.#settlements : this.#pending;
          const callback = queue.values().next().value!;
          queue.delete(callback);
          if (!renderFailed) {
            callback();
          } else {
            try {
              callback();
            } catch (error) {
              console.error("[editx] Observer failed while draining a renderer error:", error);
            }
          }
        }
      }
    } finally {
      this.#draining = false;
    }
    if (renderFailed) throw renderError;
  }
}
