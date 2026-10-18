import type { BlockStore } from "./block/block-store";
import type { Patch } from "./history-manager";
import { getPageNavigation, type PageNavigationState } from "./page-history";
import { type PageOrderChangedEvent, PageOrderState } from "./page-order";

export interface ActivePageChangedEvent {
  pageId: number | null;
  previousPageId: number | null;
}

export type ActivePageErrorCode = "PAGE_NOT_FOUND" | "BLOCK_NOT_PAGE" | "PAGE_NOT_IN_ACTIVE_SCENE";

export class ActivePageError extends Error {
  constructor(
    public readonly code: ActivePageErrorCode,
    public readonly pageId: number,
    message: string,
  ) {
    super(message);
    this.name = "ActivePageError";
  }
}

type NavigationStore = Pick<BlockStore, "get">;

function isScenePage(store: NavigationStore, sceneId: number, pageId: number): boolean {
  const scene = store.get(sceneId);
  const page = store.get(pageId);
  return (
    scene?.type === "scene" &&
    page?.type === "page" &&
    page.parentId === sceneId &&
    scene.children.includes(pageId)
  );
}

export function firstScenePage(store: NavigationStore, sceneId: number | null): number | null {
  if (sceneId === null) return null;
  return store.get(sceneId)?.children.find((id) => isScenePage(store, sceneId, id)) ?? null;
}

function validatePage(store: NavigationStore, sceneId: number | null, pageId: number): void {
  const page = store.get(pageId);
  if (!page) {
    throw new ActivePageError("PAGE_NOT_FOUND", pageId, `Page ${pageId} does not exist`);
  }
  if (page.type !== "page") {
    throw new ActivePageError("BLOCK_NOT_PAGE", pageId, `Block ${pageId} is not a page`);
  }
  if (sceneId === null || !isScenePage(store, sceneId, pageId)) {
    throw new ActivePageError(
      "PAGE_NOT_IN_ACTIVE_SCENE",
      pageId,
      sceneId === null ? "No active scene" : `Page ${pageId} not found in active scene ${sceneId}`,
    );
  }
}

export function validateNavigation(
  store: NavigationStore,
  sceneId: number | null,
  pageId: number | null,
): void {
  if (sceneId !== null && store.get(sceneId)?.type !== "scene") {
    throw new Error(`Scene ${sceneId} does not exist or is not a scene`);
  }
  if (pageId !== null) {
    validatePage(store, sceneId, pageId);
  } else if (firstScenePage(store, sceneId) !== null) {
    throw new Error(`Scene ${sceneId} requires an active page`);
  }
}

/** Navigation state is intentionally separate from document patches and history. */
export class ActivePageState {
  sceneId: number | null = null;
  pageId: number | null = null;
  #publishedPageId: number | null = null;
  #pageOrder: PageOrderState;

  constructor(
    private readonly store: NavigationStore,
    private readonly onChanged: (event: ActivePageChangedEvent) => void,
    private readonly deferNotification: (callback: () => void) => void,
    onPageOrderChanged: (event: PageOrderChangedEvent) => void,
  ) {
    this.#pageOrder = new PageOrderState(
      store,
      () => this.sceneId,
      onPageOrderChanged,
      deferNotification,
    );
  }

  setScene(sceneId: number): void {
    const pageId =
      this.pageId !== null && isScenePage(this.store, sceneId, this.pageId)
        ? this.pageId
        : firstScenePage(this.store, sceneId);
    this.replace(sceneId, pageId);
  }

  setPage(pageId: number): void {
    validatePage(this.store, this.sceneId, pageId);
    this.#changePage(pageId);
  }

  replace(sceneId: number | null, pageId: number | null): void {
    validateNavigation(this.store, sceneId, pageId);
    this.sceneId = sceneId;
    this.#changePage(pageId, false);
    this.publish();
  }

  reconcile(notify = true): ActivePageChangedEvent | null {
    if (this.sceneId !== null && this.store.get(this.sceneId)?.type !== "scene") {
      this.sceneId = null;
    }
    if (
      this.sceneId !== null &&
      this.pageId !== null &&
      isScenePage(this.store, this.sceneId, this.pageId)
    ) {
      return null;
    }
    return this.#changePage(firstScenePage(this.store, this.sceneId), notify);
  }

  applyPatches(patches: Patch[], reconcile = true): ActivePageChangedEvent | null {
    let target: PageNavigationState | null = null;
    for (const patch of patches) {
      const navigation = getPageNavigation(patch);
      if (navigation) target = navigation.after;
    }
    if (!target) return reconcile ? this.reconcile(false) : null;
    this.sceneId =
      target.sceneId !== null && this.store.get(target.sceneId)?.type === "scene"
        ? target.sceneId
        : null;
    const pageId =
      this.sceneId !== null &&
      target.pageId !== null &&
      isScenePage(this.store, this.sceneId, target.pageId)
        ? target.pageId
        : firstScenePage(this.store, this.sceneId);
    return this.#changePage(pageId, false);
  }

  publish(): void {
    this.deferNotification(this.#notify);
    this.#pageOrder.publish();
  }

  #changePage(pageId: number | null, notify = true): ActivePageChangedEvent | null {
    if (this.pageId === pageId) return null;
    const previousPageId = this.pageId;
    this.pageId = pageId;
    const event = { pageId, previousPageId };
    if (notify) this.publish();
    return event;
  }

  #notify = (): void => {
    if (this.#publishedPageId === this.pageId) return;
    const previousPageId = this.#publishedPageId;
    this.#publishedPageId = this.pageId;
    this.onChanged({ pageId: this.pageId, previousPageId });
  };
}
