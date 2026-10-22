import type { DocumentChangedCallback, DocumentChangeOrigin } from "./document-change";
import { DocumentChangeJournal } from "./document-change-journal";
import { DocumentImpactIndex } from "./document-impact-index";
import { getDocumentRootSceneId, getDocumentState, observeDocumentState } from "./document-state";
import type { EngineCore } from "./engine-core";

export interface DocumentChangeScope {
  readonly journal: DocumentChangeJournal;
  readonly owned: boolean;
}

class DocumentChangeTracker {
  #active: DocumentChangeJournal | null = null;
  #listeners = new Set<DocumentChangedCallback>();
  #transactionId = 0;
  #disposed = false;
  #index: DocumentImpactIndex;
  #unsubscribe: () => void;

  constructor(private readonly engine: EngineCore) {
    const store = engine._getBlockStore();
    this.#index = new DocumentImpactIndex(store);
    const stopBlocks = store._observeMutations((id) => this.#active?.record(id, store));
    const stopState = observeDocumentState(engine, () => this.#active?.recordState());
    this.#unsubscribe = () => {
      stopBlocks();
      stopState();
    };
  }

  subscribe(callback: DocumentChangedCallback): () => void {
    this.#listeners.add(callback);
    return () => {
      this.#listeners.delete(callback);
    };
  }

  begin(origin: DocumentChangeOrigin): DocumentChangeScope {
    if (this.#active) return { journal: this.#active, owned: false };
    const journal = new DocumentChangeJournal(this.engine, origin);
    this.#active = journal;
    return { journal, owned: true };
  }

  replacement(origin: "load" | "create"): DocumentChangeScope {
    const journal = this.#active ?? new DocumentChangeJournal(this.engine, origin);
    journal.origin = origin;
    return { journal, owned: this.#active === null };
  }

  run<T>(scope: DocumentChangeScope, operation: () => T): T {
    const journal = scope.journal;
    const previous = this.#active;
    const state = getDocumentState(this.engine);
    const current =
      !journal.closed &&
      (!journal.captured ||
        (state.id === journal.afterState.documentId &&
          getDocumentRootSceneId(this.engine) === journal.afterState.rootSceneId));
    if (current) this.#active = journal;
    try {
      return operation();
    } finally {
      if (current) journal.capture(this.engine._getBlockStore(), this.#index);
      this.#active = previous;
    }
  }

  finish(scope: DocumentChangeScope): void {
    if (!scope.owned || scope.journal.closed) return;
    const journal = scope.journal;
    if (this.#active === journal) {
      journal.capture(this.engine._getBlockStore(), this.#index);
      this.#active = null;
    }
    journal.closed = true;
    if (this.#disposed || this.#listeners.size === 0) return;
    const changes = journal.changes(this.#index);
    if (!changes) return;
    this.engine._deferNotification(() => {
      if (this.#disposed || this.#listeners.size === 0) return;
      if (this.#transactionId >= Number.MAX_SAFE_INTEGER)
        throw new RangeError("Document transaction ID space is exhausted");
      const event = Object.freeze({ transactionId: ++this.#transactionId, ...changes });
      for (const callback of this.#listeners) callback(event);
    });
  }

  dispose(): void {
    this.#disposed = true;
    this.#unsubscribe();
    this.#listeners.clear();
  }
}

const trackers = new WeakMap<EngineCore, DocumentChangeTracker>();

export function getDocumentChanges(engine: EngineCore): DocumentChangeTracker {
  let tracker = trackers.get(engine);
  if (!tracker) {
    tracker = new DocumentChangeTracker(engine);
    trackers.set(engine, tracker);
  }
  return tracker;
}

export function disposeDocumentChanges(engine: EngineCore): void {
  trackers.get(engine)?.dispose();
}
