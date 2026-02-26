import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventAPI, BlockEvent } from './event-api';

describe('EventAPI', () => {
  let api: EventAPI;

  beforeEach(() => {
    api = new EventAPI();
  });

  describe('subscribe + enqueue + flush', () => {
    it('delivers events matching subscribed block IDs', () => {
      const cb = vi.fn();
      api.subscribe([5], cb);

      api._enqueue({ type: 'updated', block: 5 });
      api._flush();

      expect(cb).toHaveBeenCalledWith([{ type: 'updated', block: 5 }]);
    });

    it('does not deliver events for non-matching block IDs', () => {
      const cb = vi.fn();
      api.subscribe([5], cb);

      api._enqueue({ type: 'updated', block: 10 });
      api._flush();

      expect(cb).not.toHaveBeenCalled();
    });

    it('empty blocks array subscribes to ALL events', () => {
      const cb = vi.fn();
      api.subscribe([], cb);

      api._enqueue({ type: 'created', block: 1 });
      api._enqueue({ type: 'updated', block: 2 });
      api._flush();

      expect(cb).toHaveBeenCalledWith([
        { type: 'created', block: 1 },
        { type: 'updated', block: 2 },
      ]);
    });

    it('delivers to multiple subscribers', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      api.subscribe([1], cb1);
      api.subscribe([1], cb2);

      api._enqueue({ type: 'updated', block: 1 });
      api._flush();

      expect(cb1).toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });

    it('does not deliver if no pending events', () => {
      const cb = vi.fn();
      api.subscribe([], cb);
      api._flush();
      expect(cb).not.toHaveBeenCalled();
    });

    it('clears pending events after flush', () => {
      const cb = vi.fn();
      api.subscribe([], cb);

      api._enqueue({ type: 'updated', block: 1 });
      api._flush();
      api._flush();

      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('stops delivering events after unsubscribe', () => {
      const cb = vi.fn();
      const unsub = api.subscribe([5], cb);

      unsub();

      api._enqueue({ type: 'updated', block: 5 });
      api._flush();

      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('deduplication', () => {
    it('keeps only one event per block per flush', () => {
      const cb = vi.fn();
      api.subscribe([], cb);

      api._enqueue({ type: 'updated', block: 1 });
      api._enqueue({ type: 'updated', block: 1 });
      api._flush();

      expect(cb).toHaveBeenCalledWith([{ type: 'updated', block: 1 }]);
    });

    it('destroyed takes priority over updated', () => {
      const cb = vi.fn();
      api.subscribe([], cb);

      api._enqueue({ type: 'updated', block: 1 });
      api._enqueue({ type: 'destroyed', block: 1 });
      api._flush();

      expect(cb).toHaveBeenCalledWith([{ type: 'destroyed', block: 1 }]);
    });

    it('destroyed takes priority over created', () => {
      const cb = vi.fn();
      api.subscribe([], cb);

      api._enqueue({ type: 'created', block: 1 });
      api._enqueue({ type: 'destroyed', block: 1 });
      api._flush();

      expect(cb).toHaveBeenCalledWith([{ type: 'destroyed', block: 1 }]);
    });

    it('created takes priority over updated', () => {
      const cb = vi.fn();
      api.subscribe([], cb);

      api._enqueue({ type: 'updated', block: 1 });
      api._enqueue({ type: 'created', block: 1 });
      api._flush();

      expect(cb).toHaveBeenCalledWith([{ type: 'created', block: 1 }]);
    });

    it('deduplicates per-block independently', () => {
      const cb = vi.fn();
      api.subscribe([], cb);

      api._enqueue({ type: 'updated', block: 1 });
      api._enqueue({ type: 'created', block: 2 });
      api._enqueue({ type: 'destroyed', block: 1 });
      api._flush();

      const events: BlockEvent[] = cb.mock.calls[0][0];
      expect(events).toHaveLength(2);
      expect(events.find(e => e.block === 1)!.type).toBe('destroyed');
      expect(events.find(e => e.block === 2)!.type).toBe('created');
    });
  });
});
