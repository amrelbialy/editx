import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSelection,
  useSelectedBlockId,
  useBlockFloat,
  useBlockString,
  useBlockBool,
  useBlockColor,
  useBlockChildren,
  useBlockType,
  useBlockKind,
} from './use-engine';
import type { CreativeEngine, Color } from '@creative-editor/engine';

function createMockEngine(overrides: Partial<{
  selection: number[];
  blockFloats: Record<string, number>;
  blockStrings: Record<string, string>;
  blockBools: Record<string, boolean>;
  blockColors: Record<string, Color>;
  blockChildren: number[];
  blockType: string | undefined;
  blockKind: string;
}> = {}): CreativeEngine {
  const selectionHandlers: Array<() => void> = [];
  const eventSubscribers: Array<{ blocks: number[]; cb: () => void }> = [];

  return {
    core: {
      on: vi.fn((event: string, handler: () => void) => {
        if (event === 'selection:changed') selectionHandlers.push(handler);
      }),
      off: vi.fn((event: string, handler: () => void) => {
        if (event === 'selection:changed') {
          const idx = selectionHandlers.indexOf(handler);
          if (idx >= 0) selectionHandlers.splice(idx, 1);
        }
      }),
      getSelection: vi.fn(() => overrides.selection ?? []),
    },
    event: {
      subscribe: vi.fn((blocks: number[], cb: () => void) => {
        const sub = { blocks, cb };
        eventSubscribers.push(sub);
        return () => {
          const idx = eventSubscribers.indexOf(sub);
          if (idx >= 0) eventSubscribers.splice(idx, 1);
        };
      }),
    },
    block: {
      getFloat: vi.fn((_id: number, key: string) => overrides.blockFloats?.[key] ?? 0),
      getString: vi.fn((_id: number, key: string) => overrides.blockStrings?.[key] ?? ''),
      getBool: vi.fn((_id: number, key: string) => overrides.blockBools?.[key] ?? false),
      getColor: vi.fn((_id: number, key: string) => overrides.blockColors?.[key] ?? { r: 0, g: 0, b: 0, a: 1 }),
      getChildren: vi.fn(() => overrides.blockChildren ?? []),
      getType: vi.fn(() => overrides.blockType),
      getKind: vi.fn(() => overrides.blockKind ?? ''),
    },
    // Internal helpers for tests to trigger subscription callbacks
    _triggerSelectionChange: () => selectionHandlers.forEach(h => h()),
    _triggerBlockEvent: () => eventSubscribers.forEach(s => s.cb()),
  } as unknown as CreativeEngine;
}

describe('useSelection', () => {
  it('returns empty array when engine is null', () => {
    const { result } = renderHook(() => useSelection(null));
    expect(result.current).toEqual([]);
  });

  it('returns selection from engine', () => {
    const engine = createMockEngine({ selection: [1, 2] });
    const { result } = renderHook(() => useSelection(engine));
    expect(result.current).toEqual([1, 2]);
  });

  it('subscribes to selection:changed', () => {
    const engine = createMockEngine();
    renderHook(() => useSelection(engine));
    expect(engine.core.on).toHaveBeenCalledWith('selection:changed', expect.any(Function));
  });
});

describe('useSelectedBlockId', () => {
  it('returns null when engine is null', () => {
    const { result } = renderHook(() => useSelectedBlockId(null));
    expect(result.current).toBeNull();
  });

  it('returns first selected block', () => {
    const engine = createMockEngine({ selection: [5, 10] });
    const { result } = renderHook(() => useSelectedBlockId(engine));
    expect(result.current).toBe(5);
  });

  it('returns null when no selection', () => {
    const engine = createMockEngine({ selection: [] });
    const { result } = renderHook(() => useSelectedBlockId(engine));
    expect(result.current).toBeNull();
  });
});

describe('useBlockFloat', () => {
  it('returns 0 when engine is null', () => {
    const { result } = renderHook(() => useBlockFloat(null, null, 'x'));
    expect(result.current).toBe(0);
  });

  it('returns 0 when blockId is null', () => {
    const engine = createMockEngine();
    const { result } = renderHook(() => useBlockFloat(engine, null, 'x'));
    expect(result.current).toBe(0);
  });

  it('returns float value from engine', () => {
    const engine = createMockEngine({ blockFloats: { 'transform/position/x': 42 } });
    const { result } = renderHook(() => useBlockFloat(engine, 1, 'transform/position/x'));
    expect(result.current).toBe(42);
  });

  it('subscribes to block events', () => {
    const engine = createMockEngine();
    renderHook(() => useBlockFloat(engine, 5, 'x'));
    expect(engine.event.subscribe).toHaveBeenCalledWith([5], expect.any(Function));
  });
});

describe('useBlockString', () => {
  it('returns empty string when engine is null', () => {
    const { result } = renderHook(() => useBlockString(null, null, 'key'));
    expect(result.current).toBe('');
  });

  it('returns string value from engine', () => {
    const engine = createMockEngine({ blockStrings: { 'text/content': 'Hello' } });
    const { result } = renderHook(() => useBlockString(engine, 1, 'text/content'));
    expect(result.current).toBe('Hello');
  });
});

describe('useBlockBool', () => {
  it('returns false when engine is null', () => {
    const { result } = renderHook(() => useBlockBool(null, null, 'key'));
    expect(result.current).toBe(false);
  });

  it('returns boolean value from engine', () => {
    const engine = createMockEngine({ blockBools: { 'appearance/visible': true } });
    const { result } = renderHook(() => useBlockBool(engine, 1, 'appearance/visible'));
    expect(result.current).toBe(true);
  });
});

describe('useBlockColor', () => {
  it('returns default black when engine is null', () => {
    const { result } = renderHook(() => useBlockColor(null, null, 'key'));
    expect(result.current).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it('returns color from engine', () => {
    const red: Color = { r: 1, g: 0, b: 0, a: 1 };
    const engine = createMockEngine({ blockColors: { 'fill/color': red } });
    const { result } = renderHook(() => useBlockColor(engine, 1, 'fill/color'));
    expect(result.current).toEqual(red);
  });
});

describe('useBlockChildren', () => {
  it('returns empty array when engine is null', () => {
    const { result } = renderHook(() => useBlockChildren(null, null));
    expect(result.current).toEqual([]);
  });

  it('returns children from engine', () => {
    const engine = createMockEngine({ blockChildren: [10, 20] });
    const { result } = renderHook(() => useBlockChildren(engine, 1));
    expect(result.current).toEqual([10, 20]);
  });

  it('subscribes to ALL block events (empty array)', () => {
    const engine = createMockEngine();
    renderHook(() => useBlockChildren(engine, 1));
    expect(engine.event.subscribe).toHaveBeenCalledWith([], expect.any(Function));
  });
});

describe('useBlockType', () => {
  it('returns undefined when engine is null', () => {
    const { result } = renderHook(() => useBlockType(null, null));
    expect(result.current).toBeUndefined();
  });

  it('returns type from engine', () => {
    const engine = createMockEngine({ blockType: 'graphic' });
    const { result } = renderHook(() => useBlockType(engine, 1));
    expect(result.current).toBe('graphic');
  });
});

describe('useBlockKind', () => {
  it('returns empty string when engine is null', () => {
    const { result } = renderHook(() => useBlockKind(null, null));
    expect(result.current).toBe('');
  });

  it('returns kind from engine', () => {
    const engine = createMockEngine({ blockKind: 'circle' });
    const { result } = renderHook(() => useBlockKind(engine, 1));
    expect(result.current).toBe('circle');
  });
});
