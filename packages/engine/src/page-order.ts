import type { BlockStore } from "./block/block-store";

type PageStore = Pick<BlockStore, "get">;

export interface PageOrderChangedEvent {
  readonly sceneId: number | null;
  readonly pageIds: readonly number[];
  readonly previousPageIds: readonly number[];
}

export function getScenePages(store: PageStore, sceneId: number | null): number[] {
  const scene = sceneId === null ? undefined : store.get(sceneId);
  if (scene?.type !== "scene") return [];
  return scene.children.filter((id) => {
    const page = store.get(id);
    return page?.type === "page" && page.parentId === sceneId;
  });
}

export class PageOrderState {
  #publishedSceneId: number | null = null;
  #publishedPages: number[] = [];

  constructor(
    private readonly store: PageStore,
    private readonly getSceneId: () => number | null,
    private readonly onChanged: (event: PageOrderChangedEvent) => void,
    private readonly deferNotification: (callback: () => void) => void,
  ) {}

  publish(): void {
    this.deferNotification(this.#notify);
  }

  #notify = (): void => {
    const sceneId = this.getSceneId();
    const pageIds = getScenePages(this.store, sceneId);
    if (
      sceneId === this.#publishedSceneId &&
      pageIds.length === this.#publishedPages.length &&
      pageIds.every((id, index) => id === this.#publishedPages[index])
    ) {
      return;
    }
    const previousPageIds = this.#publishedPages;
    this.#publishedSceneId = sceneId;
    this.#publishedPages = pageIds;
    this.onChanged(
      Object.freeze({
        sceneId,
        pageIds: Object.freeze([...pageIds]),
        previousPageIds: Object.freeze([...previousPageIds]),
      }),
    );
  };
}
