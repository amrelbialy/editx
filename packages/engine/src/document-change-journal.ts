import type { BlockData } from "./block/block.types";
import type { BlockStore } from "./block/block-store";
import type { DocumentChangeOrigin } from "./document-change";
import { samePersistedValue } from "./document-change-equality";
import type { DocumentImpactIndex } from "./document-impact-index";
import { getDocumentRootSceneId, getDocumentState } from "./document-state";
import type { DocumentMetadata } from "./document-types";
import type { EngineCore } from "./engine-core";

interface ChangeState {
  readonly documentId: string;
  readonly metadata: DocumentMetadata;
  readonly rootSceneId: number | null;
}

function readState(engine: EngineCore): ChangeState {
  const state = getDocumentState(engine);
  return {
    documentId: state.id,
    metadata: state.metadata,
    rootSceneId: getDocumentRootSceneId(engine),
  };
}

export class DocumentChangeJournal {
  readonly beforeState: ChangeState;
  afterState: ChangeState;
  readonly before = new Map<number, BlockData | null>();
  readonly after = new Map<number, BlockData | null>();
  #pending = new Set<number>();
  #stateWritten = false;
  closed = false;
  captured = false;

  constructor(
    readonly engine: EngineCore,
    public origin: DocumentChangeOrigin,
  ) {
    this.beforeState = readState(engine);
    this.afterState = this.beforeState;
  }

  record(id: number, store: BlockStore): void {
    if (!this.before.has(id)) this.before.set(id, store.snapshot(id));
    this.#pending.add(id);
  }

  recordState(): void {
    this.#stateWritten = true;
  }

  capture(store: BlockStore, index: DocumentImpactIndex): void {
    for (const id of this.#pending) {
      const block = store.snapshot(id);
      this.after.set(id, block);
      index.update(id, block);
    }
    this.#pending.clear();
    this.afterState = this.#stateWritten
      ? readState(this.engine)
      : { ...this.afterState, rootSceneId: getDocumentRootSceneId(this.engine) };
    this.#stateWritten = false;
    this.captured = true;
  }

  changes(index: DocumentImpactIndex) {
    const changedBlockIds = [...this.before.keys()].filter(
      (id) => !samePersistedValue(this.before.get(id), this.after.get(id)),
    );
    if (changedBlockIds.length === 0 && samePersistedValue(this.beforeState, this.afterState))
      return null;
    return {
      documentId: this.afterState.documentId,
      origin: this.origin,
      changedBlockIds: Object.freeze(changedBlockIds),
      affectedPageIds: Object.freeze(
        index.affectedPages(
          changedBlockIds,
          this.before,
          this.after,
          this.beforeState.rootSceneId,
          this.afterState.rootSceneId,
        ),
      ),
    };
  }
}
