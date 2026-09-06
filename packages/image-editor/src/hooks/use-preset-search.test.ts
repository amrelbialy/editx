import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PresetGroup } from "../config/config.types";
import { usePresetSearch } from "./use-preset-search";

interface Item {
  id: string;
  label: string;
}

const GROUPS: PresetGroup<Item>[] = [
  {
    id: "cat-a",
    label: "Bold Titles",
    presets: [
      { id: "a1", label: "Big Heading" },
      { id: "a2", label: "Subtitle" },
    ],
  },
  {
    id: "cat-b",
    label: "Shapes",
    presets: [
      { id: "b1", label: "Circle" },
      { id: "b2", label: "Square" },
    ],
  },
];

describe("usePresetSearch", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns all groups for an empty query", () => {
    const { result } = renderHook(() => usePresetSearch(GROUPS, ""));
    expect(result.current.groups).toHaveLength(2);
    expect(result.current.hasResults).toBe(true);
  });

  it("filters by preset label (case-insensitive, debounced)", () => {
    const { result, rerender } = renderHook(({ q }) => usePresetSearch(GROUPS, q), {
      initialProps: { q: "" },
    });

    rerender({ q: "circle" });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].id).toBe("cat-b");
    expect(result.current.groups[0].presets).toHaveLength(1);
    expect(result.current.groups[0].presets[0].id).toBe("b1");
  });

  it("keeps the whole category when the category label matches", () => {
    const { result, rerender } = renderHook(({ q }) => usePresetSearch(GROUPS, q), {
      initialProps: { q: "" },
    });

    rerender({ q: "bold" });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].id).toBe("cat-a");
    expect(result.current.groups[0].presets).toHaveLength(2);
  });

  it("reports hasResults=false for an empty result set", () => {
    const { result, rerender } = renderHook(({ q }) => usePresetSearch(GROUPS, q), {
      initialProps: { q: "" },
    });

    rerender({ q: "zzznope" });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current.groups).toHaveLength(0);
    expect(result.current.hasResults).toBe(false);
  });

  it("restores all groups when the query is cleared", () => {
    const { result, rerender } = renderHook(({ q }) => usePresetSearch(GROUPS, q), {
      initialProps: { q: "circle" },
    });

    act(() => vi.advanceTimersByTime(200));
    expect(result.current.groups).toHaveLength(1);

    rerender({ q: "" });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.groups).toHaveLength(2);
  });
});
