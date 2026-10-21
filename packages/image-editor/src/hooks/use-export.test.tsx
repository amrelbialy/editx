import { act, cleanup } from "@testing-library/react";
import { unzipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createExportFixture as setup } from "../__tests__/export-fixture";
import { resetPageNavigationStore } from "../__tests__/page-navigation-fixture";
import { useImageEditorStore } from "../store/image-editor-store";
import { downloadBlob } from "../utils/download-blob";

vi.mock("../utils/download-blob", () => ({ downloadBlob: vi.fn() }));

beforeEach(() => {
  resetPageNavigationStore();
  useImageEditorStore.getState().markDirty();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("export save pipeline", () => {
  it("preserves legacy scene export, transformation, callback, clean state and close behavior", async () => {
    const transformed = new Blob(["transformed"], { type: "image/png" });
    const onBeforeSave = vi.fn().mockResolvedValue(transformed);
    const onClose = vi.fn();
    const { result, scene, page, sceneBlob, onSave, notify } = await setup({
      events: { onBeforeSave },
      onClose,
      exportConfig: { closeAfterSave: true },
    });
    await act(async () => {
      expect(await result.current.handleExport()).toBe(true);
    });
    expect(scene).toHaveBeenCalledExactlyOnceWith({ format: "png", quality: 0.92 });
    expect(page).not.toHaveBeenCalled();
    expect(onBeforeSave).toHaveBeenCalledExactlyOnceWith(sceneBlob);
    expect(onSave).toHaveBeenCalledExactlyOnceWith(transformed);
    expect(onClose).toHaveBeenCalledWith("save", false);
    expect(notify.error).not.toHaveBeenCalled();
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(false);
  });

  it("transforms and delivers one ZIP rather than calling save once per page", async () => {
    const onBeforeSave = vi.fn((blob: Blob) => blob);
    const { result, scene, page, onSave } = await setup({ events: { onBeforeSave } });
    await act(async () => {
      expect(await result.current.handleExport({ pages: { mode: "all" } })).toBe(true);
    });
    expect(scene).not.toHaveBeenCalled();
    expect(page).toHaveBeenCalledTimes(3);
    expect(onBeforeSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
    const blob: Blob = onSave.mock.calls[0][0];
    expect(blob.type).toBe("application/zip");
    expect(Object.keys(unzipSync(new Uint8Array(await blob.arrayBuffer())))).toHaveLength(3);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("downloads a ZIP using the configured filename when no callback is provided", async () => {
    const { result } = await setup({ onSave: undefined, exportConfig: { filename: "document" } });
    await act(async () => {
      await result.current.handleExport({ pages: { mode: "all" } });
    });
    expect(downloadBlob).toHaveBeenCalledWith(
      expect.objectContaining({ type: "application/zip" }),
      "document",
    );
  });

  it("reports a page failure without saving, cleaning, closing, or hiding the failure", async () => {
    const onClose = vi.fn();
    const { result, page, onSave, notify } = await setup({
      onClose,
      exportConfig: { closeAfterSave: true },
    });
    page.mockRejectedValueOnce(new Error("Page 2 image is unavailable"));
    await act(async () => {
      expect(await result.current.handleExport({ pages: { mode: "all" } })).toBe(false);
    });
    expect(notify.error).toHaveBeenCalledWith("Page 2 image is unavailable");
    expect(notify.success).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
    expect(result.current.isExporting).toBe(false);
  });

  it("awaits asynchronous host saves and prevents concurrent exports", async () => {
    let finish!: () => void;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { result, scene } = await setup({ onSave });
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.handleExport();
    });
    expect(result.current.isExporting).toBe(true);
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
    await act(async () => {
      expect(await result.current.handleExport()).toBe(false);
    });
    expect(scene).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
      expect(await pending).toBe(true);
    });
    expect(result.current.isExporting).toBe(false);
  });

  it("reports rejected host saves and allows a retry without clearing unsaved changes", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("Upload failed"))
      .mockResolvedValueOnce(undefined);
    const { result, notify } = await setup({ onSave });
    await act(async () => {
      expect(await result.current.handleExport()).toBe(false);
    });
    expect(notify.error).toHaveBeenCalledWith("Upload failed");
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
    await act(async () => {
      expect(await result.current.handleExport()).toBe(true);
    });
  });
});
