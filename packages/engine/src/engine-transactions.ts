import type { ActivePageState } from "./active-page";
import type { BlockAPI } from "./block/block-api";
import type { Command } from "./controller/commands";
import type { DocumentChangeOrigin } from "./document-change";
import { type DocumentChangeScope, getDocumentChanges } from "./document-change-tracker";
import { applyHistoryPatches, enqueueBlockEvents, flushDirtyBlocks } from "./editx-engine-flush";
import type { EngineCallbacks } from "./engine-callbacks";
import type { EngineCore } from "./engine-core";
import { EngineNotifications } from "./engine-notifications";
import { HistoryManager, type Patch } from "./history-manager";

interface TransactionEngine extends EngineCore {
  readonly block: Pick<BlockAPI, "findAllSelected" | "_removeFromSelection">;
}

export class EngineTransactions {
  #history = new HistoryManager();
  #notifications = new EngineNotifications();
  #dirty = new Set<number>();
  #batchDepth = 0;
  #batchPatches: Patch[] = [];
  #batchHistoryPatches: Patch[] = [];
  #silentDepth = 0;
  #documentBatch: DocumentChangeScope | null = null;

  constructor(
    private readonly engine: TransactionEngine,
    private readonly navigation: ActivePageState,
    private readonly callbacks: EngineCallbacks,
  ) {}

  deferNotification(callback: () => void): void {
    this.#notifications.enqueue(callback);
  }

  beginSilent(): void {
    this.#silentDepth++;
  }

  endSilent(): void {
    if (this.#silentDepth > 0) this.#silentDepth--;
  }

  beginBatch(): void {
    if (this.#batchDepth === 0) {
      this.#documentBatch = getDocumentChanges(this.engine).begin("edit");
      this.#batchPatches = [];
      this.#batchHistoryPatches = [];
    }
    this.#batchDepth++;
    this.#notifications.begin();
  }

  endBatch(): void {
    if (this.#batchDepth <= 0) return;
    this.#batchDepth--;
    try {
      if (this.#batchDepth > 0) return;
      this.navigation.reconcile(false);
      this.engine._reconcilePageView();
      const historyChanged = this.#batchHistoryPatches.length > 0;
      if (historyChanged) this.#history.push(this.#batchHistoryPatches);
      enqueueBlockEvents(this.#batchPatches, this.engine.event);
      this.#batchPatches = [];
      this.#batchHistoryPatches = [];
      this.#cleanupSelections();
      this.navigation.publish();
      if (historyChanged) this.deferNotification(this.#notifyHistory);
      this.#notifications.render(this.#flush);
    } finally {
      if (this.#batchDepth === 0 && this.#documentBatch) {
        const scope = this.#documentBatch;
        this.#documentBatch = null;
        this.#notifications.settle(() => getDocumentChanges(this.engine).finish(scope));
      }
      this.#notifications.end();
    }
  }

  exec(command: Command): void {
    this.#run("edit", () => {
      const patches = command.do();
      this.navigation.applyPatches(patches, this.#batchDepth === 0);
      this.engine._reconcilePageView();
      const historyChanged =
        patches.length > 0 && this.#batchDepth === 0 && this.#silentDepth === 0;
      for (const patch of patches) this.#dirty.add(patch.id);
      if (this.#batchDepth > 0) {
        this.#batchPatches.push(...patches);
        if (this.#silentDepth === 0) this.#batchHistoryPatches.push(...patches);
      } else {
        if (historyChanged) this.#history.push(patches);
        enqueueBlockEvents(patches, this.engine.event);
      }
      this.#cleanupSelections();
      this.navigation.publish();
      if (historyChanged) this.deferNotification(this.#notifyHistory);
      if (this.#batchDepth === 0) this.#notifications.render(this.#flush);
    });
  }

  undo(): void {
    this.#applyHistory("undo");
  }

  redo(): void {
    this.#applyHistory("redo");
  }

  canUndo(): boolean {
    return this.#history.canUndo();
  }

  canRedo(): boolean {
    return this.#history.canRedo();
  }

  clearHistory(): void {
    this.#notifications.run(() => {
      this.#history.clear();
      this.deferNotification(() => this.engine.emit("history:clear"));
      this.deferNotification(this.#notifyHistory);
    });
  }

  renderDirty(): void {
    this.#flush();
  }

  #applyHistory(action: "undo" | "redo"): void {
    this.#run(action, () => {
      const patches = this.#history[action]();
      if (!patches) {
        this.engine._reconcilePageView();
        return;
      }
      applyHistoryPatches(patches, this.engine._getBlockStore(), this.#dirty, this.engine.event);
      this.navigation.applyPatches(patches);
      this.engine._reconcilePageView();
      this.#cleanupSelections();
      this.navigation.publish();
      this.deferNotification(() => this.engine.emit(`history:${action}`));
      this.deferNotification(this.#notifyHistory);
      this.#notifications.render(this.#flush);
    });
  }

  #run(origin: DocumentChangeOrigin, operation: () => void): void {
    this.#notifications.run(() => {
      const changes = getDocumentChanges(this.engine);
      const scope = changes.begin(origin);
      try {
        operation();
      } finally {
        if (scope.owned) this.#notifications.settle(() => changes.finish(scope));
      }
    });
  }

  #cleanupSelections(): void {
    const store = this.engine._getBlockStore();
    const destroyed = this.engine.block.findAllSelected().filter((id) => !store.exists(id));
    if (destroyed.length > 0) this.engine.block._removeFromSelection(destroyed);
  }

  #notifyHistory = (): void => {
    this.callbacks.fireHistory();
  };

  #flush = (): void => {
    const renderer = this.engine.getRenderer();
    if (renderer) {
      flushDirtyBlocks(this.#dirty, this.engine._getBlockStore(), renderer, this.engine.event);
    }
  };
}
