import type { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBlockImageFill } from "./use-block-image-fill";

describe("useBlockImageFill", () => {
  it("does not carry an image-fill result across block selection changes", () => {
    const fills = new Map<number, { src: string } | null>([
      [7, { src: "fill.png" }],
      [8, null],
    ]);
    const engine = {
      onHistoryChanged: vi.fn(() => () => {}),
      block: {
        getFillImage: vi.fn((blockId: number) => fills.get(blockId) ?? null),
        onStateChanged: vi.fn(() => () => {}),
      },
    } as unknown as EditxEngine;

    const { result, rerender } = renderHook(
      ({ blockId, blockType }) => useBlockImageFill(engine, blockId, blockType),
      { initialProps: { blockId: 7, blockType: "graphic" } },
    );

    expect(result.current).toBe(true);

    rerender({ blockId: 8, blockType: "graphic" });
    expect(result.current).toBe(false);

    rerender({ blockId: 7, blockType: "group" });
    expect(result.current).toBe(false);
  });

  it("refreshes when the image fill child changes history", () => {
    let imageFill: { src: string } | null = null;
    let notifyHistory = () => {};
    const engine = {
      onHistoryChanged: vi.fn((callback: () => void) => {
        notifyHistory = callback;
        return () => {};
      }),
      block: {
        getFillImage: vi.fn(() => imageFill),
        onStateChanged: vi.fn(() => () => {}),
      },
    } as unknown as EditxEngine;

    const { result } = renderHook(() => useBlockImageFill(engine, 7, "graphic"));
    expect(result.current).toBe(false);

    imageFill = { src: "fill.png" };
    act(notifyHistory);

    expect(result.current).toBe(true);
  });
});
