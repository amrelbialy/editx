import { describe, expect, it } from "vitest";
import { BlockStore } from "./block-store";

const creators: { label: string; create: (store: BlockStore) => number }[] = [
  { label: "block", create: (store) => store.create("graphic") },
  { label: "shape", create: (store) => store.createShape("rect") },
  { label: "fill", create: (store) => store.createFill("color") },
  { label: "effect", create: (store) => store.createEffect("filter") },
];

describe("BlockStore ID allocation", () => {
  it.each(creators)("rejects exhausted $label allocation without changing the store", ({
    create,
  }) => {
    const store = new BlockStore();
    store.resetNextId(Number.MAX_SAFE_INTEGER - 1);
    const last = create(store);
    expect(last).toBe(Number.MAX_SAFE_INTEGER - 1);
    const before = store.snapshot(last);

    for (let attempt = 0; attempt < 3; attempt++) {
      expect(() => create(store)).toThrow(RangeError);
      expect(store.getAllBlockIds()).toEqual([last]);
      expect(store.snapshot(last)).toEqual(before);
    }

    store.clear();
    expect(create(store)).toBe(1);
  });
});
