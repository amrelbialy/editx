import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageEditor } from "./image-editor";
import { useImageEditorStore } from "./store/image-editor-store";

// Track mock engine instances for assertions
let latestMockEngine: any = null;

// Shared factory — used by both @editx/engine and @editx/engine/konva mocks
const createMockEngine = () => {
  const eng = {
    scene: {
      create: vi.fn().mockResolvedValue(undefined),
      getCurrentPage: vi.fn().mockReturnValue(1),
    },
    block: {
      create: vi.fn().mockReturnValue(2),
      setString: vi.fn(),
      setSize: vi.fn(),
      setPosition: vi.fn(),
      appendChild: vi.fn(),
      setFloat: vi.fn(),
      getFloat: vi.fn().mockReturnValue(0),
      getString: vi.fn().mockReturnValue(""),
      setBool: vi.fn(),
      getBool: vi.fn().mockReturnValue(false),
      getEffects: vi.fn().mockReturnValue([]),
      getKind: vi.fn().mockReturnValue(""),
      createEffect: vi.fn().mockReturnValue(100),
      appendEffect: vi.fn(),
      removeEffect: vi.fn(),
      onSelectionChanged: vi.fn().mockReturnValue(() => {}),
      onBlockDoubleClick: vi.fn().mockReturnValue(() => {}),
      exists: vi.fn().mockReturnValue(true),
      setFillSolidColor: vi.fn(),
      getFillSolidColor: vi.fn().mockReturnValue(null),
      setStrokeColor: vi.fn(),
      getStrokeColor: vi.fn().mockReturnValue({ r: 0, g: 0, b: 0, a: 1 }),
      setFillEnabled: vi.fn(),
      setStrokeEnabled: vi.fn(),
      getAdjustmentValue: vi.fn().mockReturnValue(0),
      setAdjustmentValue: vi.fn(),
      getAdjustmentValues: vi.fn().mockReturnValue({}),
      // Editx-style crop methods
      hasCrop: vi.fn().mockReturnValue(true),
      supportsCrop: vi.fn().mockReturnValue(true),
      setCropScaleX: vi.fn(),
      getCropScaleX: vi.fn().mockReturnValue(0),
      setCropScaleY: vi.fn(),
      getCropScaleY: vi.fn().mockReturnValue(0),
      setCropRotation: vi.fn(),
      getCropRotation: vi.fn().mockReturnValue(0),
      setCropScaleRatio: vi.fn(),
      getCropScaleRatio: vi.fn().mockReturnValue(1),
      setCropTranslationX: vi.fn(),
      getCropTranslationX: vi.fn().mockReturnValue(0),
      setCropTranslationY: vi.fn(),
      getCropTranslationY: vi.fn().mockReturnValue(0),
      resetCrop: vi.fn(),
      adjustCropToFillFrame: vi.fn(),
      flipCropHorizontal: vi.fn(),
      flipCropVertical: vi.fn(),
      isCropAspectRatioLocked: vi.fn().mockReturnValue(false),
      setCropAspectRatioLocked: vi.fn(),
      applyCropRatio: vi.fn(),
      // Page convenience methods
      setPageImageSrc: vi.fn(),
      getPageImageSrc: vi.fn().mockReturnValue(""),
      setPageImageOriginalDimensions: vi.fn(),
      getPageImageOriginalDimensions: vi.fn().mockReturnValue({ width: 0, height: 0 }),
      setPageDimensions: vi.fn(),
      getPageDimensions: vi.fn().mockReturnValue({ width: 1080, height: 1080 }),
      setPageFillColor: vi.fn(),
      getPageFillColor: vi.fn().mockReturnValue({ r: 1, g: 1, b: 1, a: 1 }),
      setPageMarginsEnabled: vi.fn(),
      isPageMarginsEnabled: vi.fn().mockReturnValue(false),
      setPageMargins: vi.fn(),
      getPageMargins: vi.fn().mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 }),
    },
    editor: {
      getZoom: vi.fn().mockReturnValue(0.5),
      getPan: vi.fn().mockReturnValue({ x: 10, y: 20 }),
      setZoom: vi.fn(),
      panTo: vi.fn(),
      setEditMode: vi.fn(),
      getEditMode: vi.fn().mockReturnValue("Transform"),
      fitToScreen: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: vi.fn().mockReturnValue(false),
      canRedo: vi.fn().mockReturnValue(false),
      clearHistory: vi.fn(),
    },
    event: {
      subscribe: vi.fn().mockReturnValue(() => {}),
    },
    dispose: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    beginSilent: vi.fn(),
    endSilent: vi.fn(),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
    getBlockStore: vi.fn().mockReturnValue({ exists: vi.fn().mockReturnValue(true) }),
    onHistoryChanged: vi.fn().mockReturnValue(() => {}),
    onZoomChanged: vi.fn().mockReturnValue(() => {}),
    onEditModeChanged: vi.fn().mockReturnValue(() => {}),
  };
  latestMockEngine = eng;
  return eng;
};

// Mock the engine and image loading dependencies
vi.mock("@editx/engine", () => {
  return {
    EditxEngine: {
      create: vi.fn().mockImplementation(() => Promise.resolve(createMockEngine())),
    },
    IMAGE_SRC: "image/src",
    CROP_X: "crop/x",
    CROP_Y: "crop/y",
    CROP_WIDTH: "crop/width",
    CROP_HEIGHT: "crop/height",
    CROP_ENABLED: "crop/enabled",
    CROP_SCALE_X: "crop/scaleX",
    CROP_SCALE_Y: "crop/scaleY",
    CROP_ROTATION: "crop/rotation",
    CROP_SCALE_RATIO: "crop/scaleRatio",
    CROP_FLIP_HORIZONTAL: "crop/flipHorizontal",
    CROP_FLIP_VERTICAL: "crop/flipVertical",
    CROP_ASPECT_RATIO_LOCKED: "crop/aspectRatioLocked",
    toPrecisedFloat: vi.fn().mockImplementation((n: number) => n),
    evictImage: vi.fn(),
    EFFECT_FILTER_NAME: "effect/filter/name",
    FILTER_PRESETS: new Map(),
    getFilterPreset: vi.fn().mockReturnValue(undefined),
    ADJUSTMENT_CONFIG: {
      brightness: { key: "effect/adjustments/brightness", min: -1, max: 1, step: 0.01, default: 0 },
      saturation: { key: "effect/adjustments/saturation", min: -1, max: 1, step: 0.01, default: 0 },
      contrast: { key: "effect/adjustments/contrast", min: -1, max: 1, step: 0.01, default: 0 },
      gamma: { key: "effect/adjustments/gamma", min: -1, max: 1, step: 0.01, default: 0 },
      clarity: { key: "effect/adjustments/clarity", min: -1, max: 1, step: 0.01, default: 0 },
      exposure: { key: "effect/adjustments/exposure", min: -1, max: 1, step: 0.01, default: 0 },
      shadows: { key: "effect/adjustments/shadows", min: -1, max: 1, step: 0.01, default: 0 },
      highlights: { key: "effect/adjustments/highlights", min: -1, max: 1, step: 0.01, default: 0 },
      blacks: { key: "effect/adjustments/blacks", min: -1, max: 1, step: 0.01, default: 0 },
      whites: { key: "effect/adjustments/whites", min: -1, max: 1, step: 0.01, default: 0 },
      temperature: {
        key: "effect/adjustments/temperature",
        min: -1,
        max: 1,
        step: 0.01,
        default: 0,
      },
      sharpness: { key: "effect/adjustments/sharpness", min: 0, max: 1, step: 0.01, default: 0 },
    },
    ADJUSTMENT_PARAMS: [
      "brightness",
      "saturation",
      "contrast",
      "gamma",
      "clarity",
      "exposure",
      "shadows",
      "highlights",
      "blacks",
      "whites",
      "temperature",
      "sharpness",
    ],
  };
});

vi.mock("@editx/engine/konva", () => ({
  createEngine: vi.fn().mockImplementation(() => Promise.resolve(createMockEngine())),
}));

const mockLoadImage = vi.fn().mockResolvedValue({
  naturalWidth: 800,
  naturalHeight: 600,
  src: "https://example.com/img.png",
});

vi.mock("./utils/load-image", () => ({
  loadImage: (...args: any[]) => mockLoadImage(...args),
  sourceToUrl: vi.fn().mockImplementation((src: any) => {
    if (typeof src === "string") return src;
    return "blob:http://localhost/mock-blob-url";
  }),
  revokeObjectUrl: vi.fn(),
}));

vi.mock("./utils/validate-image", () => ({
  validateImageFile: vi.fn().mockReturnValue({ valid: true, warnings: [] }),
  validateImageDimensions: vi.fn().mockReturnValue({ valid: true, warnings: [] }),
}));

vi.mock("./utils/downscale-image", () => ({
  downscaleIfNeeded: vi.fn().mockImplementation((img: any) => ({
    dataUrl: img.src,
    workingWidth: img.naturalWidth,
    workingHeight: img.naturalHeight,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    wasDownscaled: false,
  })),
}));

vi.mock("./utils/correct-orientation", () => ({
  correctOrientation: vi.fn().mockRejectedValue(new Error("not a blob")),
}));

vi.mock("./utils/is-same-source", () => ({
  isSameSource: vi.fn().mockReturnValue(false),
}));

vi.mock("./utils/extract-filename", () => ({
  extractFilename: vi.fn().mockReturnValue("test-image"),
}));

vi.mock("./components/toolbar", () => ({
  ImageEditorToolbar: () => React.createElement("div", { "data-testid": "toolbar" }),
}));

// Helper to find the EditorShell element (has width/height styles)
function findEditorShell(container: HTMLElement): HTMLElement {
  // EditorShell is the div with both width and height styles
  // It's inside ThemeProvider > EditorShell
  const shell = container.querySelector('[style*="width"][style*="height"]') as HTMLElement;
  return shell ?? (container.firstElementChild as HTMLElement);
}

// Helper to find the interactive wrapper (the div with tabIndex)
function findInteractiveWrapper(container: HTMLElement): HTMLElement {
  return container.querySelector('[tabindex="0"]') as HTMLElement;
}

describe("ImageEditor", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    latestMockEngine = null;
    // Reset store
    useImageEditorStore.setState({
      activeTool: "select",
      originalImage: null,
      isLoading: true,
      editableBlockId: null,
      error: null,
      shownImageDimensions: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders without crashing", () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: "https://example.com/img.png" }),
    );
    // Component should render the editor shell with topbar content (default config title)
    expect(container.textContent).toContain("Image Editor");
  });

  it("shows loading overlay initially", () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: "https://example.com/img.png" }),
    );
    expect(container.textContent).toContain("Loading image...");
  });

  it("applies width and height styles", () => {
    const { container } = render(
      React.createElement(ImageEditor, {
        src: "https://example.com/img.png",
        width: 500,
        height: 400,
      }),
    );
    const shell = findEditorShell(container);
    expect(shell.style.width).toBe("500px");
    expect(shell.style.height).toBe("400px");
  });

  it("defaults width to 100% and height to 100vh", () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: "https://example.com/img.png" }),
    );
    const shell = findEditorShell(container);
    expect(shell.style.width).toBe("100%");
    expect(shell.style.height).toBe("100vh");
  });

  it("shows error overlay when image fails to load", async () => {
    mockLoadImage.mockRejectedValueOnce(new Error("Network error"));

    const { container } = render(
      React.createElement(ImageEditor, { src: "https://example.com/bad.png" }),
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Failed to load image");
      expect(container.textContent).toContain("Network error");
    });
  });

  it("shows retry button on error", async () => {
    mockLoadImage.mockRejectedValueOnce(new Error("Timeout"));

    const { container } = render(
      React.createElement(ImageEditor, { src: "https://example.com/timeout.png" }),
    );

    await waitFor(() => {
      const buttons = Array.from(container.querySelectorAll("button"));
      const retryButton = buttons.find((b) => b.textContent?.includes("Retry"));
      expect(retryButton).toBeDefined();
    });
  });

  it("retry button re-triggers init", async () => {
    mockLoadImage
      .mockRejectedValueOnce(new Error("First fail"))
      .mockResolvedValueOnce({ naturalWidth: 800, naturalHeight: 600, src: "test" });

    const { container } = render(
      React.createElement(ImageEditor, { src: "https://example.com/retry.png" }),
    );

    // Wait for error state
    await waitFor(() => {
      expect(container.textContent).toContain("Failed to load image");
    });

    // Click retry
    const buttons = Array.from(container.querySelectorAll("button"));
    const retryButton = buttons.find((b) => b.textContent?.includes("Retry"))!;
    fireEvent.click(retryButton);

    // loadImage should be called again
    await waitFor(() => {
      expect(mockLoadImage).toHaveBeenCalledTimes(2);
    });
  });

  it("disposes engine on unmount", async () => {
    const { unmount } = render(
      React.createElement(ImageEditor, { src: "https://example.com/img.png" }),
    );

    // Wait for engine to be created
    await waitFor(() => {
      expect(latestMockEngine).not.toBeNull();
    });

    const engineToCheck = latestMockEngine;
    unmount();

    expect(engineToCheck.dispose).toHaveBeenCalled();
  });

  it("has tabIndex for keyboard/paste focus", () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: "https://example.com/img.png" }),
    );
    const wrapper = findInteractiveWrapper(container);
    expect(wrapper).toBeDefined();
    expect(wrapper.getAttribute("tabindex")).toBe("0");
  });

  it("accepts drag-over events without error", () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: "https://example.com/img.png" }),
    );
    const wrapper = findInteractiveWrapper(container);

    // Should not throw
    fireEvent.dragOver(wrapper, {
      dataTransfer: { files: [], getData: () => "" },
    });
  });

  it("handles drop with image file", async () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: "https://example.com/img.png" }),
    );

    await waitFor(() => {
      expect(mockLoadImage).toHaveBeenCalledTimes(1);
    });

    const wrapper = findInteractiveWrapper(container);
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });

    fireEvent.drop(wrapper, {
      dataTransfer: {
        files: [file],
        getData: () => "",
      },
    });

    // Should trigger a second load (re-init with the dropped file)
    await waitFor(() => {
      expect(mockLoadImage).toHaveBeenCalledTimes(2);
    });
  });

  it("handles paste with image blob", async () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: "https://example.com/img.png" }),
    );

    await waitFor(() => {
      expect(mockLoadImage).toHaveBeenCalledTimes(1);
    });

    const wrapper = findInteractiveWrapper(container);
    const blob = new File(["data"], "clipboard.png", { type: "image/png" });

    fireEvent.paste(wrapper, {
      clipboardData: {
        items: [
          {
            type: "image/png",
            getAsFile: () => blob,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(mockLoadImage).toHaveBeenCalledTimes(2);
    });
  });

  it("stores shownImageDimensions after load", async () => {
    render(React.createElement(ImageEditor, { src: "https://example.com/img.png" }));

    await waitFor(() => {
      const dims = useImageEditorStore.getState().shownImageDimensions;
      expect(dims).not.toBeNull();
      // Mock engine getZoom returns 0.5, image 800x600
      expect(dims!.width).toBe(400);
      expect(dims!.height).toBe(300);
      expect(dims!.scale).toBe(0.5);
    });
  });

  it("stores extracted filename in originalImage.name", async () => {
    render(React.createElement(ImageEditor, { src: "https://example.com/sunset.jpg" }));

    await waitFor(() => {
      const img = useImageEditorStore.getState().originalImage;
      expect(img).not.toBeNull();
      expect(img!.name).toBe("test-image");
    });
  });
});
