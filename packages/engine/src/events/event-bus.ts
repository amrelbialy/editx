export class EventBus {
  private listeners = new Map<string, Set<Function>>();

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: Function) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, payload?: any) {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }
}
