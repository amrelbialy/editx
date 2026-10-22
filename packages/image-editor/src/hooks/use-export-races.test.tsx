import type { RendererAdapter } from "@editx/engine";
import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createExportFixture as setup } from "../__tests__/export-fixture";
import { resetPageNavigationStore } from "../__tests__/page-navigation-fixture";
import { useImageEditorStore } from "../store/image-editor-store";

beforeEach(() => {
  resetPageNavigationStore();
  useImageEditorStore.getState().markDirty();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function loadingRenderer(createScene: RendererAdapter["createScene"]): RendererAdapter {
  return {
    init: async () => {},
    createScene,
    syncBlock: vi.fn(),
    removeBlock: vi.fn(),
    showTransformer: vi.fn(),
    hideTransformer: vi.fn(),
    getSelectedBlockScreenRect: () => null,
    getBlockScreenRect: () => null,
    setZoom: vi.fn(),
    getZoom: () => 1,
    panTo: vi.fn(),
    getPan: () => ({ x: 0, y: 0 }),
    fitToScreen: vi.fn(),
    fitToRect: vi.fn(),
    centerOnRect: vi.fn(),
    screenToWorld: (point) => point,
    worldToScreen: (point) => point,
    renderFrame: vi.fn(),
    exportScene: async () => new Blob(),
    exportBlock: async () => new Blob(),
    dispose: vi.fn(),
    setCursor: vi.fn(),
    showCropOverlay: vi.fn(),
    hideCropOverlay: vi.fn(),
    offsetCropChildNodes: vi.fn(),
    setCropRect: vi.fn(),
    setCropRatio: vi.fn(),
    getCropRect: () => null,
    getCropImageRect: () => null,
  };
}

describe("export document races", () => {
  it("rejects replacement content before asynchronous scene loading reaches history:clear", async () => {
    const onBeforeSave = vi.fn((blob: Blob) => blob);
    const { result, engine, cover, page, onSave, notify } = await setup({
      events: { onBeforeSave },
    });
    const original = engine.scene.saveToString();
    engine.scene.setPageProperties(cover, { name: "Replacement" });
    const replacement = engine.scene.saveToString();
    await engine.scene.loadFromString(original);
    let finishLoad!: () => void;
    const loading = new Promise<void>((resolve) => {
      finishLoad = resolve;
    });
    vi.spyOn(engine, "getRenderer").mockReturnValue(loadingRenderer(() => loading));
    let finishExport!: (blob: Blob) => void;
    page.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          finishExport = resolve;
        }),
    );
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.handleExport({ pages: { mode: "all" } });
    });
    const replaced = engine.scene.loadFromString(replacement);
    expect(engine.scene.getPageProperties(cover).name).toBe("Replacement");
    try {
      await act(async () => {
        finishExport(new Blob(["old first page"]));
        expect(await pending).toBe(false);
      });
      expect(page).toHaveBeenCalledTimes(1);
      expect(onBeforeSave).not.toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
      expect(notify.error).toHaveBeenCalledWith(
        "The document changed during export. Please try again.",
      );
      expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
    } finally {
      finishLoad();
      await replaced;
    }
  });

  it("rejects same-block canonical replacement when only document identity changes", async () => {
    const onBeforeSave = vi.fn((blob: Blob) => blob);
    const { result, engine, page, onSave, notify } = await setup({
      events: { onBeforeSave },
    });
    const replacement = JSON.parse(engine.document.saveToString()) as { id: string };
    replacement.id = "replacement-document";
    let finishLoad!: () => void;
    const loading = new Promise<void>((resolve) => {
      finishLoad = resolve;
    });
    vi.spyOn(engine, "getRenderer").mockReturnValue(loadingRenderer(() => loading));
    let finishExport!: (blob: Blob) => void;
    page.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          finishExport = resolve;
        }),
    );
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.handleExport({ pages: { mode: "all" } });
    });
    const replaced = engine.document.loadFromString(JSON.stringify(replacement));
    expect(engine.document.getId()).toBe("replacement-document");
    try {
      await act(async () => {
        finishExport(new Blob(["old first page"]));
        expect(await pending).toBe(false);
      });
      expect(page).toHaveBeenCalledTimes(1);
      expect(onBeforeSave).not.toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
      expect(notify.error).toHaveBeenCalledWith(
        "The document changed during export. Please try again.",
      );
    } finally {
      finishLoad();
      await replaced;
    }
  });

  it("rejects silent page changes that create no history notification", async () => {
    const { result, engine, poster, page, onSave, notify } = await setup();
    let finish!: (blob: Blob) => void;
    page.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          finish = resolve;
        }),
    );
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.handleExport({ pages: { mode: "all" } });
    });
    engine.beginSilent();
    try {
      engine.scene.setPageProperties(poster, { name: "Silent change" });
    } finally {
      engine.endSilent();
    }
    expect(engine.canUndo()).toBe(false);
    await act(async () => {
      finish(new Blob(["first page"]));
      expect(await pending).toBe(false);
    });
    expect(page).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith(
      "The document changed during export. Please try again.",
    );
  });

  it("allows active-page navigation while an archive is rendering", async () => {
    const { result, engine, poster, page, onSave } = await setup();
    let finish!: (blob: Blob) => void;
    page.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          finish = resolve;
        }),
    );
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.handleExport({ pages: { mode: "all" } });
    });
    act(() => engine.scene.setActivePage(poster));
    await act(async () => {
      finish(new Blob(["first page"]));
      expect(await pending).toBe(true);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(engine.scene.getCurrentPage()).toBe(poster);
  });
});
