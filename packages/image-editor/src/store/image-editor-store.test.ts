import { beforeEach, describe, expect, it } from "vitest";
import { useImageEditorStore } from "./image-editor-store";

describe("useImageEditorStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useImageEditorStore.setState({
      activeTool: "select",
      originalImage: null,
      isLoading: true,
      editableBlockId: null,
      error: null,
      shownImageDimensions: null,
      cropPreset: "free",
    });
  });

  describe("initial state", () => {
    it("activeTool is select", () => {
      expect(useImageEditorStore.getState().activeTool).toBe("select");
    });

    it("originalImage is null", () => {
      expect(useImageEditorStore.getState().originalImage).toBeNull();
    });

    it("isLoading is true", () => {
      expect(useImageEditorStore.getState().isLoading).toBe(true);
    });

    it("editableBlockId is null", () => {
      expect(useImageEditorStore.getState().editableBlockId).toBeNull();
    });

    it("error is null", () => {
      expect(useImageEditorStore.getState().error).toBeNull();
    });
  });

  describe("setActiveTool", () => {
    it("updates activeTool", () => {
      useImageEditorStore.getState().setActiveTool("crop");
      expect(useImageEditorStore.getState().activeTool).toBe("crop");
    });

    it("can cycle through tools", () => {
      const tools = [
        "select",
        "crop",
        "rotate",
        "adjust",
        "filter",
        "resize",
        "shapes",
        "text",
        "pen",
      ] as const;
      for (const tool of tools) {
        useImageEditorStore.getState().setActiveTool(tool);
        expect(useImageEditorStore.getState().activeTool).toBe(tool);
      }
    });
  });

  describe("setOriginalImage", () => {
    it("updates originalImage", () => {
      const info = { src: "test.png", width: 100, height: 200, name: "test" };
      useImageEditorStore.getState().setOriginalImage(info);
      expect(useImageEditorStore.getState().originalImage).toEqual(info);
    });
  });

  describe("setLoading", () => {
    it("updates isLoading", () => {
      useImageEditorStore.getState().setLoading(false);
      expect(useImageEditorStore.getState().isLoading).toBe(false);
    });
  });

  describe("setEditableBlockId", () => {
    it("updates editableBlockId", () => {
      useImageEditorStore.getState().setEditableBlockId(42);
      expect(useImageEditorStore.getState().editableBlockId).toBe(42);
    });

    it("can set back to null", () => {
      useImageEditorStore.getState().setEditableBlockId(42);
      useImageEditorStore.getState().setEditableBlockId(null);
      expect(useImageEditorStore.getState().editableBlockId).toBeNull();
    });
  });

  describe("setError", () => {
    it("sets error message", () => {
      useImageEditorStore.getState().setError("Something went wrong");
      expect(useImageEditorStore.getState().error).toBe("Something went wrong");
    });

    it("can set error to null", () => {
      useImageEditorStore.getState().setError("Error");
      useImageEditorStore.getState().setError(null);
      expect(useImageEditorStore.getState().error).toBeNull();
    });
  });

  describe("clearError", () => {
    it("clears a previously set error", () => {
      useImageEditorStore.getState().setError("Network failure");
      useImageEditorStore.getState().clearError();
      expect(useImageEditorStore.getState().error).toBeNull();
    });
  });

  describe("shownImageDimensions", () => {
    it("is null initially", () => {
      expect(useImageEditorStore.getState().shownImageDimensions).toBeNull();
    });

    it("setShownImageDimensions updates the dimensions", () => {
      const dims = { width: 400, height: 300, scale: 0.5 };
      useImageEditorStore.getState().setShownImageDimensions(dims);
      expect(useImageEditorStore.getState().shownImageDimensions).toEqual(dims);
    });

    it("is a no-op when error is already null", () => {
      useImageEditorStore.getState().clearError();
      expect(useImageEditorStore.getState().error).toBeNull();
    });
  });

  describe("crop state", () => {
    it("cropPreset defaults to free", () => {
      expect(useImageEditorStore.getState().cropPreset).toBe("free");
    });

    it("setCropPreset updates cropPreset", () => {
      useImageEditorStore.getState().setCropPreset("4:3");
      expect(useImageEditorStore.getState().cropPreset).toBe("4:3");
    });

    it("setCropPreset cycles through all presets", () => {
      const presetIds = ["free", "original", "1:1", "4:3", "3:4", "16:9", "9:16"] as const;
      for (const id of presetIds) {
        useImageEditorStore.getState().setCropPreset(id);
        expect(useImageEditorStore.getState().cropPreset).toBe(id);
      }
    });
  });
});
