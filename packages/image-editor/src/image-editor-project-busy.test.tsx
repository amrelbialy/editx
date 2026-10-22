import { EditxEngine } from "@editx/engine";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectRenderer, projectPng } from "./__tests__/project-file-fixture";
import { ImageEditor } from "./image-editor";
import type { EditorHandle } from "./image-editor.types";
import { useImageEditorStore } from "./store/image-editor-store";

const state = vi.hoisted<{
  ref: { current: EditxEngine | null };
  workspace: ReturnType<typeof vi.fn>;
  duplicate: ReturnType<typeof vi.fn>;
  deleteBlock: ReturnType<typeof vi.fn>;
}>(() => ({
  ref: { current: null },
  workspace: vi.fn(() => null),
  duplicate: vi.fn(),
  deleteBlock: vi.fn(),
}));

vi.mock("./hooks/use-engine", () => ({
  useEngine: () => ({
    engine: state.ref.current,
    engineRef: state.ref,
    containerRef: { current: null },
    selectedShapeId: null,
    setSelectedShapeId: vi.fn(),
    handleRetry: vi.fn(),
  }),
}));
vi.mock("./hooks/use-tools", () => ({
  useTools: () => ({
    activeTool: "select",
    handleSidebarToolSelect: vi.fn(),
    setActiveTool: vi.fn(),
    duplicate: state.duplicate,
    deleteBlock: state.deleteBlock,
    crop: { handleCropCancel: vi.fn() },
    blockActions: {},
    notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  }),
}));
vi.mock("./components/shell/editor-workspace", () => ({
  EditorWorkspace: (props: object) => state.workspace(props),
}));

afterEach(() => {
  cleanup();
  state.ref.current?.dispose();
  state.ref.current = null;
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

async function setup() {
  const renderer = createProjectRenderer();
  const engine = new EditxEngine({ renderer });
  await engine.scene.create();
  state.ref.current = engine;
  useImageEditorStore.setState({
    isLoading: false,
    error: null,
    hasUnsavedChanges: false,
    activeTool: "select",
  });
  const ready = vi.fn<(handle: EditorHandle) => void>();
  render(<ImageEditor src="/ignored.png" onReady={ready} />);
  await waitFor(() => expect(ready).toHaveBeenCalledOnce());
  return { engine, renderer, handle: ready.mock.calls[0][0] };
}

describe("project operation input locking", () => {
  it("blocks document shortcuts throughout delayed renderer replacement and restores them", async () => {
    const { engine, renderer, handle } = await setup();
    const bytes = engine.document.saveToArchive();
    const original = engine.document.saveToString();
    engine.block.setName(engine.scene.getCurrentPage()!, "old undo history");
    const undo = vi.spyOn(engine.editor, "undo");
    let release!: () => void;
    const loading = vi.spyOn(renderer, "createScene").mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    let pending!: ReturnType<EditorHandle["loadProject"]>;
    act(() => {
      pending = handle.loadProject(bytes);
    });
    await waitFor(() => expect(loading).toHaveBeenCalledOnce());
    expect(state.workspace).toHaveBeenLastCalledWith(
      expect.objectContaining({ projectBusy: true }),
    );
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    fireEvent.keyDown(window, { key: "Delete" });
    expect(undo).not.toHaveBeenCalled();
    expect(state.duplicate).not.toHaveBeenCalled();
    expect(state.deleteBlock).not.toHaveBeenCalled();
    await act(async () => {
      release();
      await pending;
    });
    expect(engine.document.saveToString()).toBe(original);
    expect(engine.canUndo()).toBe(false);
    expect(state.workspace).toHaveBeenLastCalledWith(
      expect.objectContaining({ projectBusy: false }),
    );
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(undo).toHaveBeenCalledOnce();
    fireEvent.keyDown(window, { key: "Delete" });
    expect(state.deleteBlock).toHaveBeenCalledOnce();
  });

  it("keeps input locked until every overlapping programmatic project operation finishes", async () => {
    const { engine, handle } = await setup();
    let first!: (blob: Blob) => void;
    let second!: (blob: Blob) => void;
    vi.spyOn(engine.document, "exportPreview")
      .mockImplementationOnce(
        () =>
          new Promise<Blob>((resolve) => {
            first = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Blob>((resolve) => {
            second = resolve;
          }),
      );
    let a!: Promise<Blob>;
    let b!: Promise<Blob>;
    act(() => {
      a = handle.saveProject();
      b = handle.saveProject();
    });
    const png = new Blob([projectPng], { type: "image/png" });
    await act(async () => {
      first(png);
      await a;
    });
    expect(state.workspace).toHaveBeenLastCalledWith(
      expect.objectContaining({ projectBusy: true }),
    );
    await act(async () => {
      second(png);
      await b;
    });
    expect(state.workspace).toHaveBeenLastCalledWith(
      expect.objectContaining({ projectBusy: false }),
    );
  });
});
