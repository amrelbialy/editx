import { useSyncExternalStore, useCallback, useRef } from 'react';
import type { CreativeEngine, Color } from '@creative-editor/engine';

type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Shallow equality helpers — prevent new references from triggering re-renders
// ---------------------------------------------------------------------------

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function colorsEqual(a: Color, b: Color): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

// ---------------------------------------------------------------------------
// Selection (uses legacy EventBus — selection isn't a block lifecycle event)
// ---------------------------------------------------------------------------

const EMPTY_SELECTION: number[] = [];

export function useSelection(engine: CreativeEngine | null): number[] {
  const subscribe = useCallback(
    (callback: () => void): Unsubscribe => {
      if (!engine) return () => {};
      engine.core.on('selection:changed', callback);
      return () => engine.core.off('selection:changed', callback);
    },
    [engine],
  );

  const cached = useRef<number[]>(EMPTY_SELECTION);

  const getSnapshot = useCallback(() => {
    if (!engine) return EMPTY_SELECTION;
    const next = engine.block.findAllSelected();
    if (arraysEqual(cached.current, next)) return cached.current;
    cached.current = next;
    return next;
  }, [engine]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useSelectedBlockId(
  engine: CreativeEngine | null,
): number | null {
  const selection = useSelection(engine);
  return selection[0] ?? null;
}

// ---------------------------------------------------------------------------
// Block property hooks — use engine.event.subscribe([blockId], callback)
// ---------------------------------------------------------------------------

export function useBlockFloat(
  engine: CreativeEngine | null,
  blockId: number | null,
  key: string,
): number {
  const subscribe = useCallback(
    (callback: () => void): Unsubscribe => {
      if (!engine || blockId === null) return () => {};
      return engine.event.subscribe([blockId], callback);
    },
    [engine, blockId],
  );

  const getSnapshot = useCallback(
    () =>
      engine && blockId !== null ? engine.block.getFloat(blockId, key) : 0,
    [engine, blockId, key],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useBlockString(
  engine: CreativeEngine | null,
  blockId: number | null,
  key: string,
): string {
  const subscribe = useCallback(
    (callback: () => void): Unsubscribe => {
      if (!engine || blockId === null) return () => {};
      return engine.event.subscribe([blockId], callback);
    },
    [engine, blockId],
  );

  const getSnapshot = useCallback(
    () =>
      engine && blockId !== null ? engine.block.getString(blockId, key) : '',
    [engine, blockId, key],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useBlockBool(
  engine: CreativeEngine | null,
  blockId: number | null,
  key: string,
): boolean {
  const subscribe = useCallback(
    (callback: () => void): Unsubscribe => {
      if (!engine || blockId === null) return () => {};
      return engine.event.subscribe([blockId], callback);
    },
    [engine, blockId],
  );

  const getSnapshot = useCallback(
    () =>
      engine && blockId !== null ? engine.block.getBool(blockId, key) : false,
    [engine, blockId, key],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

// ---------------------------------------------------------------------------
// Block color (object — needs reference stability)
// ---------------------------------------------------------------------------

const DEFAULT_COLOR: Color = { r: 0, g: 0, b: 0, a: 1 };

export function useBlockColor(
  engine: CreativeEngine | null,
  blockId: number | null,
  key: string,
): Color {
  const subscribe = useCallback(
    (callback: () => void): Unsubscribe => {
      if (!engine || blockId === null) return () => {};
      return engine.event.subscribe([blockId], callback);
    },
    [engine, blockId],
  );

  const cached = useRef<Color>(DEFAULT_COLOR);

  const getSnapshot = useCallback(() => {
    if (!engine || blockId === null) return DEFAULT_COLOR;
    const next = engine.block.getColor(blockId, key);
    if (colorsEqual(cached.current, next)) return cached.current;
    cached.current = next;
    return next;
  }, [engine, blockId, key]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

// ---------------------------------------------------------------------------
// Block children (array — needs reference stability)
// Uses empty array = subscribe to ALL block events (children can be any block)
// ---------------------------------------------------------------------------

const EMPTY_CHILDREN: number[] = [];

export function useBlockChildren(
  engine: CreativeEngine | null,
  blockId: number | null,
): number[] {
  const subscribe = useCallback(
    (callback: () => void): Unsubscribe => {
      if (!engine) return () => {};
      return engine.event.subscribe([], callback);
    },
    [engine],
  );

  const cached = useRef<number[]>(EMPTY_CHILDREN);

  const getSnapshot = useCallback(() => {
    if (!engine || blockId === null) return EMPTY_CHILDREN;
    const next = engine.block.getChildren(blockId);
    if (arraysEqual(cached.current, next)) return cached.current;
    cached.current = next;
    return next;
  }, [engine, blockId]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

// ---------------------------------------------------------------------------
// Block type / kind (primitives — stable by nature)
// ---------------------------------------------------------------------------

export function useBlockType(
  engine: CreativeEngine | null,
  blockId: number | null,
): string | undefined {
  const subscribe = useCallback(
    (callback: () => void): Unsubscribe => {
      if (!engine || blockId === null) return () => {};
      return engine.event.subscribe([blockId], callback);
    },
    [engine, blockId],
  );

  const getSnapshot = useCallback(
    () =>
      engine && blockId !== null ? engine.block.getType(blockId) : undefined,
    [engine, blockId],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useBlockKind(
  engine: CreativeEngine | null,
  blockId: number | null,
): string {
  const subscribe = useCallback(
    (callback: () => void): Unsubscribe => {
      if (!engine || blockId === null) return () => {};
      return engine.event.subscribe([blockId], callback);
    },
    [engine, blockId],
  );

  const getSnapshot = useCallback(
    () => (engine && blockId !== null ? engine.block.getKind(blockId) : ''),
    [engine, blockId],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}
