import type { BlockStore } from "./block/block-store";

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

  constructor(
    private readonly store: NavigationStore,
    private readonly onChanged: (event: ActivePageChangedEvent) => void,
  ) {}

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
    this.#changePage(pageId);
  }

  reconcile(): void {
    if (this.sceneId !== null && this.store.get(this.sceneId)?.type !== "scene") {
      this.sceneId = null;
    }
    if (
      this.sceneId !== null &&
      this.pageId !== null &&
      isScenePage(this.store, this.sceneId, this.pageId)
    ) {
      return;
    }
    this.#changePage(firstScenePage(this.store, this.sceneId));
  }

  #changePage(pageId: number | null): void {
    if (this.pageId === pageId) return;
    const previousPageId = this.pageId;
    this.pageId = pageId;
    this.onChanged({ pageId, previousPageId });
  }
}
