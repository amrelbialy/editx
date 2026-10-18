import type { Patch } from "./history-manager";

export interface PageNavigationState {
  sceneId: number | null;
  pageId: number | null;
}

interface PageNavigationChange {
  before: PageNavigationState;
  after: PageNavigationState;
}

const pageNavigation = Symbol("page-navigation");

interface PageHistoryPatch extends Patch {
  [pageNavigation]: PageNavigationChange;
}

function isPageHistoryPatch(patch: Patch): patch is PageHistoryPatch {
  return pageNavigation in patch;
}

export function withPageNavigation(
  patch: Patch,
  before: PageNavigationState,
  after: PageNavigationState,
): Patch {
  const result: PageHistoryPatch = { ...patch, [pageNavigation]: { before, after } };
  return result;
}

export function getPageNavigation(patch: Patch): PageNavigationChange | null {
  return isPageHistoryPatch(patch) ? patch[pageNavigation] : null;
}

export function invertHistoryPatch(patch: Patch): Patch {
  const reversed: Patch = { id: patch.id, before: patch.after, after: patch.before };
  return isPageHistoryPatch(patch)
    ? withPageNavigation(reversed, patch[pageNavigation].after, patch[pageNavigation].before)
    : reversed;
}
