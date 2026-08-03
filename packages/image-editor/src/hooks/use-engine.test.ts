import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useImageEditorStore } from "../store/image-editor-store";
import { useEngine } from "./use-engine";

// The Konva engine drags in canvas/WebGL that happy-dom can't provide, and the
// hook only touches it once a real container ref is attached (never in these
// pure-handler tests), so stub the factory at the module boundary.
vi.mock("@editx/engine/konva", () => ({
  createEngine: vi.fn(),
}));

function dragEvent(overrides: { files?: File[]; uriList?: string }): React.DragEvent {
  const files = overrides.files ?? [];
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: {
      files,
      getData: vi.fn((type: string) =>
        type === "text/uri-list" || type === "text/plain" ? (overrides.uriList ?? "") : "",
      ),
    },
  } as unknown as React.DragEvent;
}

function clipboardEvent(items: Array<{ type: string; file: File | null }>): React.ClipboardEvent {
  return {
    preventDefault: vi.fn(),
    clipboardData: {
      items: items.map((i) => ({ type: i.type, getAsFile: () => i.file })),
    },
  } as unknown as React.ClipboardEvent;
}

describe("useEngine", () => {
  beforeEach(() => {
    useImageEditorStore.setState({
      activeTool: "select",
      originalImage: null,
      isLoading: true,
      editableBlockId: null,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the engine interface with sensible initial values", () => {
    const { result } = renderHook(() => useEngine({ src: "https://example.com/a.png" }));

    // No container is attached in renderHook, so initialization stays inert.
    expect(result.current.engine).toBeNull();
    expect(result.current.engineRef.current).toBeNull();
    expect(result.current.selectedShapeId).toBeNull();
    expect(typeof result.current.initEditor).toBe("function");
    expect(typeof result.current.handleRetry).toBe("function");
  });

  it("setSelectedShapeId updates the exposed selected shape id", () => {
    const { result } = renderHook(() => useEngine({ src: "https://example.com/a.png" }));

    act(() => {
      result.current.setSelectedShapeId(42);
    });

    expect(result.current.selectedShapeId).toBe(42);
  });

  it("handleDragOver suppresses the browser's default drop handling", () => {
    const { result } = renderHook(() => useEngine({ src: "https://example.com/a.png" }));
    const e = dragEvent({});

    act(() => {
      result.current.handleDragOver(e);
    });

    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(e.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("handleDrop consumes an image file drop", () => {
    const { result } = renderHook(() => useEngine({ src: "https://example.com/a.png" }));
    const file = new File(["x"], "photo.png", { type: "image/png" });
    const e = dragEvent({ files: [file] });

    act(() => {
      result.current.handleDrop(e);
    });

    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(e.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("handleDrop consumes an image URL drop", () => {
    const { result } = renderHook(() => useEngine({ src: "https://example.com/a.png" }));
    const e = dragEvent({ uriList: "https://example.com/dropped.png" });

    act(() => {
      result.current.handleDrop(e);
    });

    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(e.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("handlePaste consumes an image clipboard item", () => {
    const { result } = renderHook(() => useEngine({ src: "https://example.com/a.png" }));
    const file = new File(["x"], "pasted.png", { type: "image/png" });
    const e = clipboardEvent([{ type: "image/png", file }]);

    act(() => {
      result.current.handlePaste(e);
    });

    expect(e.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("handlePaste ignores non-image clipboard content", () => {
    const { result } = renderHook(() => useEngine({ src: "https://example.com/a.png" }));
    const e = clipboardEvent([{ type: "text/plain", file: null }]);

    act(() => {
      result.current.handlePaste(e);
    });

    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});
