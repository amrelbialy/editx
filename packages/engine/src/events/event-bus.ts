/** Known event signatures emitted by the engine. */
export interface EventMap {
  'selection:changed': (ids: number[]) => void;
  'history:undo': () => void;
  'history:redo': () => void;
  'history:clear': () => void;
  'stage:click': (worldPos: { x: number; y: number }) => void;
}

type EventName = keyof EventMap;
type EventHandler<E extends EventName> = EventMap[E];

export class EventBus {
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  on<E extends EventName>(event: E, handler: EventHandler<E>): void;
  on(event: string, handler: (...args: any[]) => void): void;
  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off<E extends EventName>(event: E, handler: EventHandler<E>): void;
  off(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit<E extends EventName>(event: E, ...args: Parameters<EventHandler<E>>): void;
  emit(event: string, ...args: any[]): void;
  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((handler) => handler(...args));
  }
}
