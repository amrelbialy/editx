import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from './event-bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on / emit', () => {
    it('calls handler when event is emitted', () => {
      const handler = vi.fn();
      bus.on('selection:changed', handler);
      bus.emit('selection:changed', [1, 2]);
      expect(handler).toHaveBeenCalledWith([1, 2]);
    });

    it('calls handler with correct arguments', () => {
      const handler = vi.fn();
      bus.on('stage:click', handler);
      bus.emit('stage:click', { x: 10, y: 20 });
      expect(handler).toHaveBeenCalledWith({ x: 10, y: 20 });
    });

    it('supports multiple handlers on same event', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('history:undo', h1);
      bus.on('history:undo', h2);
      bus.emit('history:undo');
      expect(h1).toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });

    it('does not call handler for different event', () => {
      const handler = vi.fn();
      bus.on('history:undo', handler);
      bus.emit('history:redo');
      expect(handler).not.toHaveBeenCalled();
    });

    it('does nothing when emitting event with no listeners', () => {
      // Should not throw
      bus.emit('history:clear');
    });
  });

  describe('off', () => {
    it('removes handler so it is no longer called', () => {
      const handler = vi.fn();
      bus.on('history:undo', handler);
      bus.off('history:undo', handler);
      bus.emit('history:undo');
      expect(handler).not.toHaveBeenCalled();
    });

    it('only removes the specific handler', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('history:undo', h1);
      bus.on('history:undo', h2);
      bus.off('history:undo', h1);
      bus.emit('history:undo');
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });

    it('does nothing when removing non-existent handler', () => {
      // Should not throw
      bus.off('history:undo', vi.fn());
    });
  });

  describe('custom string events', () => {
    it('supports arbitrary string event names', () => {
      const handler = vi.fn();
      bus.on('custom:event', handler);
      bus.emit('custom:event', 'data');
      expect(handler).toHaveBeenCalledWith('data');
    });
  });
});
