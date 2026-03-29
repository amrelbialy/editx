export type BlockEventType = "created" | "updated" | "destroyed";

export interface BlockEvent {
  type: BlockEventType;
  block: number;
}

interface Subscription {
  blocks: Set<number> | null;
  callback: (events: BlockEvent[]) => void;
}

/**
 * Subscribe to block lifecycle events in the engine.
 *
 * Inspired by an event-driven API — events are bundled and
 * delivered at the end of each engine update cycle (after flush).
 *
 * Usage:
 * const unsub = engine.event.subscribe([5, 12], (events) => { ... });
 * // events: [{ type: 'updated', block: 5 }, ...]
 *
 * Pass an empty array to subscribe to ALL block events.
 */
export class EventAPI {
  #subscriptions = new Map<number, Subscription>();
  #nextId = 1;
  #pending: BlockEvent[] = [];

  /**
   * Subscribe to block lifecycle events.
   * @param blocks — block IDs to filter by. Empty array = all blocks.
   * @param callback — called with bundled events at end of update cycle.
   * @returns unsubscribe function
   */
  subscribe(blocks: number[], callback: (events: BlockEvent[]) => void): () => void {
    const id = this.#nextId++;
    const sub: Subscription = {
      blocks: blocks.length > 0 ? new Set(blocks) : null,
      callback,
    };
    this.#subscriptions.set(id, sub);
    return () => {
      this.#subscriptions.delete(id);
    };
  }

  /** @internal — called by Engine to queue an event during command execution */
  _enqueue(event: BlockEvent): void {
    this.#pending.push(event);
  }

  /** @internal — called by Engine at the end of each update cycle to deliver events */
  _flush(): void {
    if (this.#pending.length === 0) return;

    const events = this.#dedupe(this.#pending);
    this.#pending = [];

    for (const sub of this.#subscriptions.values()) {
      if (sub.blocks === null) {
        sub.callback(events);
      } else {
        const filtered = events.filter((e) => sub.blocks!.has(e.block));
        if (filtered.length > 0) {
          sub.callback(filtered);
        }
      }
    }
  }

  /**
   * Deduplicate events: if a block has multiple events in one cycle,
   * keep only the most significant one (destroyed > created > updated).
   */
  #dedupe(events: BlockEvent[]): BlockEvent[] {
    const map = new Map<number, BlockEvent>();
    for (const e of events) {
      const existing = map.get(e.block);
      if (!existing) {
        map.set(e.block, e);
      } else if (e.type === "destroyed") {
        map.set(e.block, e);
      } else if (e.type === "created" && existing.type !== "destroyed") {
        map.set(e.block, e);
      }
    }
    return Array.from(map.values());
  }
}
