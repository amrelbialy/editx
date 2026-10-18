import type { BlockData, Color } from "./block/block.types";
import type { BlockStore } from "./block/block-store";
import { FILL_COLOR, PAGE_HEIGHT, PAGE_METADATA, PAGE_WIDTH } from "./block/property-keys";

/** Persisted string-only UI hints, not thumbnail data or document/template metadata. */
export type PageMetadata = Readonly<Record<string, string>>;

export interface PageProperties {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly backgroundColor: Color;
  readonly metadata: PageMetadata | null;
}

export type PagePropertiesUpdate = Readonly<{
  name?: string;
  backgroundColor?: Color;
  metadata?: PageMetadata | null;
}> &
  (Readonly<{ width: number; height: number }> | Readonly<{ width?: never; height?: never }>);

export function requireScenePage(
  store: Pick<BlockStore, "get">,
  sceneId: number | null,
  pageId: number,
): BlockData {
  if (sceneId === null) throw new Error("No active scene");
  const scene = store.get(sceneId);
  const page = store.get(pageId);
  if (
    scene?.type !== "scene" ||
    page?.type !== "page" ||
    page.parentId !== sceneId ||
    !scene.children.includes(pageId)
  ) {
    throw new Error(`Page ${pageId} not found in scene`);
  }
  return page;
}

export function validatePageDimensions(
  width: unknown,
  height: unknown,
): { width: number; height: number } {
  if (
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new RangeError("Page dimensions must be finite positive numbers");
  }
  return { width, height };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.getOwnPropertyDescriptor(value, key) !== undefined;
}

function backgroundColor(value: unknown): Color {
  if (!isRecord(value)) throw new TypeError("Page background must be an RGBA color");
  const channel = (key: keyof Color): number => {
    const component = value[key];
    if (
      typeof component !== "number" ||
      !Number.isFinite(component) ||
      component < 0 ||
      component > 1
    ) {
      throw new RangeError("Page background channels must be finite numbers between 0 and 1");
    }
    return component;
  };
  return { r: channel("r"), g: channel("g"), b: channel("b"), a: channel("a") };
}

function metadata(value: unknown): PageMetadata | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new TypeError("Page metadata must be a string-only map or null");
  const entries: [string, string][] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new TypeError("Page metadata keys and values must be strings");
    }
    const entry = value[key];
    if (typeof entry !== "string") {
      throw new TypeError("Page metadata keys and values must be strings");
    }
    entries.push([key, entry]);
  }
  return Object.freeze(Object.fromEntries(entries));
}

export function readPageProperties(page: BlockData): PageProperties {
  const props = page.properties;
  return {
    name: page.name,
    ...validatePageDimensions(props[PAGE_WIDTH] ?? 1080, props[PAGE_HEIGHT] ?? 1080),
    backgroundColor: backgroundColor(props[FILL_COLOR] ?? { r: 1, g: 1, b: 1, a: 1 }),
    metadata: props[PAGE_METADATA] === undefined ? null : metadata(props[PAGE_METADATA]),
  };
}

export function applyPageProperties(page: BlockData, update: PagePropertiesUpdate): BlockData {
  if (!isRecord(update)) throw new TypeError("Page properties update must be an object");
  const allowed = new Set(["name", "width", "height", "backgroundColor", "metadata"]);
  for (const key of Reflect.ownKeys(update)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      throw new TypeError(`Unknown page property: ${String(key)}`);
    }
  }
  const after = { ...page, properties: { ...page.properties } };
  if (hasOwn(update, "name")) {
    const name = update.name;
    if (typeof name !== "string") throw new TypeError("Page name must be a string");
    after.name = name;
  }
  if (hasOwn(update, "width") || hasOwn(update, "height")) {
    const size = validatePageDimensions(update.width, update.height);
    after.properties[PAGE_WIDTH] = size.width;
    after.properties[PAGE_HEIGHT] = size.height;
  }
  if (hasOwn(update, "backgroundColor")) {
    after.properties[FILL_COLOR] = backgroundColor(update.backgroundColor);
  }
  if (hasOwn(update, "metadata")) {
    const value = metadata(update.metadata);
    if (value === null) delete after.properties[PAGE_METADATA];
    else after.properties[PAGE_METADATA] = value;
  }
  return after;
}

export function samePageProperties(left: PageProperties, right: PageProperties): boolean {
  const a = left.metadata;
  const b = right.metadata;
  return (
    left.name === right.name &&
    left.width === right.width &&
    left.height === right.height &&
    left.backgroundColor.r === right.backgroundColor.r &&
    left.backgroundColor.g === right.backgroundColor.g &&
    left.backgroundColor.b === right.backgroundColor.b &&
    left.backgroundColor.a === right.backgroundColor.a &&
    (a === null || b === null
      ? a === b
      : Object.keys(a).length === Object.keys(b).length &&
        Object.keys(a).every((key) => hasOwn(b, key) && a[key] === b[key]))
  );
}
