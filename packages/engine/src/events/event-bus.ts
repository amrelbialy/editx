/** Known event signatures emitted by the engine. */
export interface EventMap {
  "selection:changed": (ids: number[]) => void;
  "block:stateChanged": (ids: number[]) => void;
  "history:undo": () => void;
  "history:redo": () => void;
  "history:clear": () => void;
  "stage:click": (worldPos: { x: number; y: number }) => void;
  "zoom:changed": (zoom: number) => void;
  "variable:changed": (name: string, value: string | undefined) => void;
}

type EventName = keyof EventMap;
type EventHandler<E extends EventName> = EventMap[E];

export class EventBus {
  #listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  on<E extends EventName>(event: E, handler: EventHandler<E>): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event)!.add(handler as (...args: unknown[]) => void);
  }

  off<E extends EventName>(event: E, handler: EventHandler<E>): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.#listeners.get(event)?.delete(handler as (...args: unknown[]) => void);
  }

  emit<E extends EventName>(event: E, ...args: Parameters<EventHandler<E>>): void;
  emit(event: string, ...args: unknown[]): void;
  emit(event: string, ...args: unknown[]): void {
    const handlers = this.#listeners.get(event);
    if (handlers) {
      for (const handler of handlers) handler(...args);
    }
  }
}
