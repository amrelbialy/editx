import type { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useImageEditorStore } from "../../../store/image-editor-store";
import { useBlockPropertiesState } from "./use-block-properties-state";

describe("useBlockPropertiesState", () => {
  beforeEach(() => {
    useImageEditorStore.setState({
      textSelectionRange: null,
      editingTextBlockId: null,
    });
  });

  it("reacts when a graphic owner changes to an image fill", () => {
    let imageFill: { src: string } | null = null;
    const ownerChangedListeners: Array<() => void> = [];
    const engine = {
      onHistoryChanged: vi.fn(() => () => {}),
      block: {
        getOpacity: vi.fn(() => 1),
        getFillImage: vi.fn(() => imageFill),
        getFill: vi.fn(() => null),
        getColor: vi.fn(() => null),
        onStateChanged: vi.fn((_ids, callback) => {
          ownerChangedListeners.push(callback);
          return () => {};
        }),
      },
    } as unknown as EditxEngine;

    const { result } = renderHook(() =>
      useBlockPropertiesState({
        engine,
        blockId: 7,
        isText: false,
        isImage: false,
        isGraphic: true,
      }),
    );

    expect(result.current.hasImageFill).toBe(false);

    imageFill = { src: "processed.png" };
    act(() => {
      for (const listener of ownerChangedListeners) listener();
    });

    expect(result.current.hasImageFill).toBe(true);
    expect(engine.block.getFillImage).toHaveBeenCalledWith(7);
  });
});
