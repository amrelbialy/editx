import { createDocumentId } from "./document-id";
import type { DocumentMetadata } from "./document-types";
import type { EngineCore } from "./engine-core";

interface DocumentState {
  readonly id: string;
  readonly metadata: DocumentMetadata;
  readonly rootSceneId: number | null;
}

const states = new WeakMap<EngineCore, DocumentState>();
const observers = new WeakMap<EngineCore, Set<() => void>>();

export function observeDocumentState(engine: EngineCore, callback: () => void): () => void {
  const listeners = observers.get(engine) ?? new Set<() => void>();
  observers.set(engine, listeners);
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function initializeDocumentState(engine: EngineCore): void {
  resetDocumentState(engine, null);
}

export function getDocumentState(engine: EngineCore): DocumentState {
  const state = states.get(engine);
  if (!state) throw new Error("Document state has not been initialized");
  return state;
}

export function getDocumentRootSceneId(engine: EngineCore): number | null {
  const rootSceneId = getDocumentState(engine).rootSceneId;
  if (rootSceneId === null) return null;
  return engine._getBlockStore().get(rootSceneId)?.type === "scene" ? rootSceneId : null;
}

export function replaceDocumentState(
  engine: EngineCore,
  id: string,
  metadata: DocumentMetadata,
  rootSceneId: number | null,
): void {
  states.set(engine, Object.freeze({ id, metadata, rootSceneId }));
  for (const callback of observers.get(engine) ?? []) callback();
}

export function resetDocumentState(engine: EngineCore, rootSceneId: number | null): void {
  replaceDocumentState(engine, createDocumentId(), Object.freeze({}), rootSceneId);
}

export function setDocumentRootSceneId(engine: EngineCore, rootSceneId: number | null): void {
  const state = getDocumentState(engine);
  replaceDocumentState(engine, state.id, state.metadata, rootSceneId);
}
