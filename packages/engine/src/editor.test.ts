import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Engine } from './engine';
import { EditorAPI } from './editor/editor-api';
import { BlockAPI } from './block/block-api';
import { CreateBlockCommand, SetPropertyCommand } from './controller/commands';
import { createMockRenderer } from './__tests__/mocks/mock-renderer';
import type { RendererAdapter } from './render-adapter';
import {
  SIZE_WIDTH, SIZE_HEIGHT,
  PAGE_WIDTH, PAGE_HEIGHT,
  IMAGE_SRC, IMAGE_ORIGINAL_WIDTH, IMAGE_ORIGINAL_HEIGHT,
  CROP_ENABLED, CROP_X, CROP_Y, CROP_WIDTH, CROP_HEIGHT,
  IMAGE_ROTATION, CROP_FLIP_HORIZONTAL, CROP_FLIP_VERTICAL,
} from './block/property-keys';

describe('EditorAPI — Edit Mode Management', () => {
  let engine: Engine;
  let editor: EditorAPI;
  let block: BlockAPI;
  let renderer: RendererAdapter;

  beforeEach(() => {
    renderer = createMockRenderer();
    engine = new Engine({ renderer });
    block = new BlockAPI(engine);
    editor = new EditorAPI(engine);
    editor._setBlockAPI(block);
  });

  // ── setEditMode / getEditMode ────────────────────────

  describe('setEditMode / getEditMode', () => {
    it('defaults to Transform mode', () => {
      expect(editor.getEditMode()).toBe('Transform');
    });

    it('sets and gets a built-in mode', () => {
      editor.setEditMode('Crop');
      expect(editor.getEditMode()).toBe('Crop');
    });

    it('sets and gets Text mode', () => {
      editor.setEditMode('Text');
      expect(editor.getEditMode()).toBe('Text');
    });

    it('sets and gets Playback mode', () => {
      editor.setEditMode('Playback');
      expect(editor.getEditMode()).toBe('Playback');
    });

    it('sets and gets Trim mode', () => {
      editor.setEditMode('Trim');
      expect(editor.getEditMode()).toBe('Trim');
    });

    it('accepts custom mode strings', () => {
      editor.setEditMode('MyCustomMode');
      expect(editor.getEditMode()).toBe('MyCustomMode');
    });

    it('custom mode with base inherits config from base', () => {
      editor.setEditMode('CustomCrop', { baseMode: 'Crop' });
      expect(editor.getEditMode()).toBe('CustomCrop');

      const config = editor.getEditModeConfig();
      expect(config.defaultCursor).toBe('crosshair');
      expect(config.showTransformer).toBe(false);
    });

    it('custom mode without base falls back to Transform config', () => {
      editor.setEditMode('UnknownMode');
      const config = editor.getEditModeConfig();
      expect(config.defaultCursor).toBe('default');
      expect(config.showTransformer).toBe(true);
    });

    it('switching modes back and forth works', () => {
      editor.setEditMode('Crop');
      editor.setEditMode('Transform');
      expect(editor.getEditMode()).toBe('Transform');

      editor.setEditMode('Text');
      editor.setEditMode('Crop');
      expect(editor.getEditMode()).toBe('Crop');
    });
  });

  // ── Mode config ──────────────────────────────────────

  describe('getEditModeConfig', () => {
    it('Transform config enables transformer and selection', () => {
      editor.setEditMode('Transform');
      const config = editor.getEditModeConfig();
      expect(config).toEqual({
        defaultCursor: 'default',
        showTransformer: true,
        blocksSelectable: true,
        blocksDraggable: true,
      });
    });

    it('Crop config disables transformer and selection', () => {
      editor.setEditMode('Crop');
      const config = editor.getEditModeConfig();
      expect(config).toEqual({
        defaultCursor: 'crosshair',
        showTransformer: false,
        blocksSelectable: false,
        blocksDraggable: false,
      });
    });

    it('Text config uses text cursor', () => {
      editor.setEditMode('Text');
      const config = editor.getEditModeConfig();
      expect(config.defaultCursor).toBe('text');
    });

    it('Trim config uses col-resize cursor', () => {
      editor.setEditMode('Trim');
      const config = editor.getEditModeConfig();
      expect(config.defaultCursor).toBe('col-resize');
    });
  });

  // ── Cursor ───────────────────────────────────────────

  describe('getCursorType', () => {
    it('defaults to "default" in Transform mode', () => {
      expect(editor.getCursorType()).toBe('default');
    });

    it('changes to mode default cursor on setEditMode', () => {
      editor.setEditMode('Crop');
      expect(editor.getCursorType()).toBe('crosshair');

      editor.setEditMode('Text');
      expect(editor.getCursorType()).toBe('text');
    });

    it('updates renderer cursor when mode changes', () => {
      editor.setEditMode('Crop');
      expect(renderer.setCursor).toHaveBeenCalledWith('crosshair');
    });
  });

  describe('getCursorRotation', () => {
    it('defaults to 0', () => {
      expect(editor.getCursorRotation()).toBe(0);
    });

    it('resets to 0 when mode changes', () => {
      editor.setCursorRotation(45);
      expect(editor.getCursorRotation()).toBe(45);

      editor.setEditMode('Crop');
      expect(editor.getCursorRotation()).toBe(0);
    });
  });

  // ── Text cursor position ─────────────────────────────

  describe('text cursor screen position', () => {
    it('defaults to (0, 0)', () => {
      expect(editor.getTextCursorPositionInScreenSpaceX()).toBe(0);
      expect(editor.getTextCursorPositionInScreenSpaceY()).toBe(0);
    });

    it('returns values set on the editor', () => {
      editor.setTextCursorPositionInScreenSpace(120, 340);
      expect(editor.getTextCursorPositionInScreenSpaceX()).toBe(120);
      expect(editor.getTextCursorPositionInScreenSpaceY()).toBe(340);
    });
  });

  // ── Events ───────────────────────────────────────────

  describe('editMode:changed event', () => {
    it('fires when mode changes', () => {
      const handler = vi.fn();
      engine.on('editMode:changed', handler);

      editor.setEditMode('Crop');

      expect(handler).toHaveBeenCalledWith({
        mode: 'Crop',
        previousMode: 'Transform',
      });
    });

    it('fires with correct previous mode on successive changes', () => {
      const handler = vi.fn();
      engine.on('editMode:changed', handler);

      editor.setEditMode('Crop');
      editor.setEditMode('Text');

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler.mock.calls[1][0]).toEqual({
        mode: 'Text',
        previousMode: 'Crop',
      });
    });

    it('fires even when setting the same mode again', () => {
      const handler = vi.fn();
      engine.on('editMode:changed', handler);

      editor.setEditMode('Crop');
      editor.setEditMode('Crop');

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  // ── Crop mode integration ────────────────────────────

  describe('Crop mode via setEditMode', () => {
    it('shows crop overlay when entering Crop with selected block', () => {
      const store = engine.getBlockStore();
      const cmd = new CreateBlockCommand(store, 'image');
      engine.exec(cmd);
      const blockId = cmd.getCreatedId()!;
      store.setProperty(blockId, SIZE_WIDTH, 200);
      store.setProperty(blockId, SIZE_HEIGHT, 100);

      block.select(blockId);
      editor.setEditMode('Crop');

      expect(renderer.showCropOverlay).toHaveBeenCalledWith(
        blockId,
        { x: 0, y: 0, width: 200, height: 100 },
        undefined,
        { rotation: 0, flipH: false, flipV: false, sourceWidth: 200, sourceHeight: 100 },
      );
    });

    it('uses first selected block when blockId not provided', () => {
      const store = engine.getBlockStore();
      const cmd = new CreateBlockCommand(store, 'image');
      engine.exec(cmd);
      const blockId = cmd.getCreatedId()!;
      store.setProperty(blockId, SIZE_WIDTH, 300);
      store.setProperty(blockId, SIZE_HEIGHT, 150);

      block.select(blockId);
      editor.setEditMode('Crop');

      expect(renderer.showCropOverlay).toHaveBeenCalled();
    });

    it('hides crop overlay when leaving Crop mode', () => {
      const store = engine.getBlockStore();
      const cmd = new CreateBlockCommand(store, 'image');
      engine.exec(cmd);
      const blockId = cmd.getCreatedId()!;

      block.select(blockId);
      editor.setEditMode('Crop');
      vi.mocked(renderer.hideCropOverlay).mockClear();

      editor.setEditMode('Transform');

      expect(renderer.hideCropOverlay).toHaveBeenCalled();
    });

    it('auto-commits crop properties when exiting Crop mode', () => {
      const store = engine.getBlockStore();
      const cmd = new CreateBlockCommand(store, 'image');
      engine.exec(cmd);
      const blockId = cmd.getCreatedId()!;

      block.select(blockId);
      editor.setEditMode('Crop');

      const cropRect = { x: 10, y: 20, width: 80, height: 60 };
      vi.mocked(renderer.getCropRect).mockReturnValue(cropRect);

      // Exit crop mode — should auto-commit
      editor.setEditMode('Transform');

      expect(store.getBool(blockId, CROP_ENABLED)).toBe(true);
      expect(store.getFloat(blockId, CROP_X)).toBe(10);
      expect(store.getFloat(blockId, CROP_Y)).toBe(20);
      expect(store.getFloat(blockId, CROP_WIDTH)).toBe(80);
      expect(store.getFloat(blockId, CROP_HEIGHT)).toBe(60);
      expect(editor.getEditMode()).toBe('Transform');
    });

    it('cancel = exit + undo discards the auto-committed crop', () => {
      const store = engine.getBlockStore();
      const cmd = new CreateBlockCommand(store, 'image');
      engine.exec(cmd);
      const blockId = cmd.getCreatedId()!;

      block.select(blockId);
      editor.setEditMode('Crop');

      const cropRect = { x: 10, y: 20, width: 80, height: 60 };
      vi.mocked(renderer.getCropRect).mockReturnValue(cropRect);

      // Exit crop mode (auto-commits), then undo
      editor.setEditMode('Transform');
      editor.undo();

      // Properties should be back to defaults
      expect(store.getBool(blockId, CROP_ENABLED)).toBe(false);
      expect(store.getFloat(blockId, CROP_X)).toBe(0);
      expect(store.getFloat(blockId, CROP_WIDTH)).toBe(0);
    });
  });
});

describe('EditorAPI — existing API still works', () => {
  let engine: Engine;
  let editor: EditorAPI;
  let renderer: RendererAdapter;

  beforeEach(() => {
    renderer = createMockRenderer();
    engine = new Engine({ renderer });
    editor = new EditorAPI(engine);
  });

  it('undo/redo delegates work', () => {
    expect(editor.canUndo()).toBe(false);
    expect(editor.canRedo()).toBe(false);
  });

  // Selection tests now live in block-api.test.ts (selection owned by BlockAPI)

  it('zoom delegates work', () => {
    editor.setZoom(2);
    expect(renderer.setZoom).toHaveBeenCalledWith(2);
  });

  it('pan delegates work', () => {
    editor.panTo(10, 20);
    expect(renderer.panTo).toHaveBeenCalledWith(10, 20);
  });
});

// ── Crop improvement: img.ly-style crop ─────────────────────

describe('EditorAPI — img.ly-style crop (page resize)', () => {
  let engine: Engine;
  let editor: EditorAPI;
  let block: BlockAPI;
  let renderer: RendererAdapter;

  /** Helper: create a page block with an image and original dimensions. */
  function createPageWithImage(w: number, h: number) {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, 'page');
    engine.exec(cmd);
    const id = cmd.getCreatedId()!;
    store.setProperty(id, PAGE_WIDTH, w);
    store.setProperty(id, PAGE_HEIGHT, h);
    store.setProperty(id, IMAGE_SRC, 'test.png');
    store.setProperty(id, IMAGE_ORIGINAL_WIDTH, w);
    store.setProperty(id, IMAGE_ORIGINAL_HEIGHT, h);
    return id;
  }

  beforeEach(() => {
    renderer = createMockRenderer();
    engine = new Engine({ renderer });
    block = new BlockAPI(engine);
    editor = new EditorAPI(engine);
    editor._setBlockAPI(block);
    // Wire up crop ratio handler (same as CreativeEngine does)
    block._setApplyCropRatioHandler((ratio) => editor._getCrop().applyCropRatio(ratio));
  });

  it('auto-commit on exit mode resizes page to crop dimensions', () => {
    const pageId = createPageWithImage(1920, 1080);
    block.select(pageId);
    editor.setEditMode('Crop');

    const cropRect = { x: 100, y: 50, width: 960, height: 540 };
    vi.mocked(renderer.getCropRect).mockReturnValue(cropRect);

    // Exit crop mode — auto-commits
    editor.setEditMode('Transform');

    const store = engine.getBlockStore();
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(960);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(540);
    expect(store.getFloat(pageId, CROP_X)).toBe(100);
    expect(store.getFloat(pageId, CROP_Y)).toBe(50);
    expect(store.getFloat(pageId, CROP_WIDTH)).toBe(960);
    expect(store.getFloat(pageId, CROP_HEIGHT)).toBe(540);
    expect(store.getBool(pageId, CROP_ENABLED)).toBe(true);
  });

  it('auto-commit does NOT resize non-page blocks', () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, 'image');
    engine.exec(cmd);
    const imgId = cmd.getCreatedId()!;
    store.setProperty(imgId, SIZE_WIDTH, 800);
    store.setProperty(imgId, SIZE_HEIGHT, 600);

    block.select(imgId);
    editor.setEditMode('Crop');

    vi.mocked(renderer.getCropRect).mockReturnValue({ x: 10, y: 10, width: 400, height: 300 });
    editor.setEditMode('Transform');

    // image block keeps its original dimensions
    expect(store.getFloat(imgId, SIZE_WIDTH)).toBe(800);
    expect(store.getFloat(imgId, SIZE_HEIGHT)).toBe(600);
  });

  it('undo after exit-mode auto-commit restores page dimensions and crop props', () => {
    const pageId = createPageWithImage(1080, 1080);
    block.select(pageId);
    editor.setEditMode('Crop');

    vi.mocked(renderer.getCropRect).mockReturnValue({ x: 100, y: 100, width: 800, height: 600 });
    editor.setEditMode('Transform');

    const store = engine.getBlockStore();
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(800);
    expect(store.getBool(pageId, CROP_ENABLED)).toBe(true);

    // Undo the crop — should restore everything atomically
    editor.undo();

    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1080);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(1080);
    expect(store.getBool(pageId, CROP_ENABLED)).toBe(false);
    expect(store.getFloat(pageId, CROP_WIDTH)).toBe(0);
  });

  it('setupCropOverlay uses original image dims when available', () => {
    const pageId = createPageWithImage(1920, 1080);
    const store = engine.getBlockStore();

    // Simulate a previous crop that resized the page
    store.setProperty(pageId, PAGE_WIDTH, 960);
    store.setProperty(pageId, PAGE_HEIGHT, 540);
    store.setProperty(pageId, CROP_ENABLED, true);
    store.setProperty(pageId, CROP_X, 100);
    store.setProperty(pageId, CROP_Y, 50);
    store.setProperty(pageId, CROP_WIDTH, 960);
    store.setProperty(pageId, CROP_HEIGHT, 540);

    block.select(pageId);
    editor.setEditMode('Crop');

    // Should show overlay with ORIGINAL dims (1920×1080), not current page dims (960×540)
    expect(renderer.showCropOverlay).toHaveBeenCalledWith(
      pageId,
      { x: 0, y: 0, width: 1920, height: 1080 },
      { x: 100, y: 50, width: 960, height: 540 },
      { rotation: 0, flipH: false, flipV: false, sourceWidth: 1920, sourceHeight: 1080 },
    );
  });

  it('setupCropOverlay falls back to page dims when originals are 0', () => {
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, 'page');
    engine.exec(cmd);
    const pageId = cmd.getCreatedId()!;
    store.setProperty(pageId, PAGE_WIDTH, 500);
    store.setProperty(pageId, PAGE_HEIGHT, 500);
    // IMAGE_ORIGINAL_WIDTH/HEIGHT default to 0

    block.select(pageId);
    editor.setEditMode('Crop');

    expect(renderer.showCropOverlay).toHaveBeenCalledWith(
      pageId,
      { x: 0, y: 0, width: 500, height: 500 },
      undefined,
      { rotation: 0, flipH: false, flipV: false, sourceWidth: 500, sourceHeight: 500 },
    );
  });

  it('setupCropOverlay swaps imageRect dims after 90° rotation', () => {
    const store = engine.getBlockStore();
    // Create a portrait page with original dims 640×960
    const pageId = createPageWithImage(640, 960);

    // Rotate 90° CW — swaps PAGE_WIDTH/HEIGHT to 960×640
    block.rotateClockwise(pageId);

    expect(store.getFloat(pageId, IMAGE_ROTATION)).toBe(90);
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(960);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(640);

    // Enter crop mode
    block.select(pageId);
    vi.mocked(renderer.showCropOverlay).mockClear();
    editor.setEditMode('Crop');

    // Should show overlay with VISUAL (rotated) dims 960×640, NOT source 640×960
    expect(renderer.showCropOverlay).toHaveBeenCalledWith(
      pageId,
      { x: 0, y: 0, width: 960, height: 640 },
      undefined,
      { rotation: 90, flipH: false, flipV: false, sourceWidth: 640, sourceHeight: 960 },
    );
  });

  it('setupCropOverlay transforms existing crop to visual space after rotation', () => {
    const store = engine.getBlockStore();
    const pageId = createPageWithImage(640, 960);

    // Simulate: previous crop in source space, then rotation
    store.setProperty(pageId, IMAGE_ROTATION, 90);
    store.setProperty(pageId, PAGE_WIDTH, 960);
    store.setProperty(pageId, PAGE_HEIGHT, 640);
    store.setProperty(pageId, CROP_ENABLED, true);
    // Source crop rect: x=0, y=0, w=640, h=480 in pre-rotation space
    store.setProperty(pageId, CROP_X, 0);
    store.setProperty(pageId, CROP_Y, 0);
    store.setProperty(pageId, CROP_WIDTH, 640);
    store.setProperty(pageId, CROP_HEIGHT, 480);

    block.select(pageId);
    vi.mocked(renderer.showCropOverlay).mockClear();
    editor.setEditMode('Crop');

    // Verify the overlay was called with visual-space imageRect (960×640)
    const call = vi.mocked(renderer.showCropOverlay).mock.calls[0];
    expect(call[1]).toEqual({ x: 0, y: 0, width: 960, height: 640 });
    // Initial crop should be transformed to visual space (non-undefined)
    expect(call[2]).toBeDefined();
    expect(call[3]).toEqual({ rotation: 90, flipH: false, flipV: false, sourceWidth: 640, sourceHeight: 960 });
  });

  it('block.resetCrop restores page to original dimensions', () => {
    const pageId = createPageWithImage(1920, 1080);
    const store = engine.getBlockStore();

    // Simulate a committed crop
    store.setProperty(pageId, PAGE_WIDTH, 960);
    store.setProperty(pageId, PAGE_HEIGHT, 540);
    store.setProperty(pageId, CROP_ENABLED, true);
    store.setProperty(pageId, CROP_X, 100);
    store.setProperty(pageId, CROP_Y, 50);
    store.setProperty(pageId, CROP_WIDTH, 960);
    store.setProperty(pageId, CROP_HEIGHT, 540);

    block.resetCrop(pageId);

    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1920);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(1080);
    expect(store.getBool(pageId, CROP_ENABLED)).toBe(false);
    expect(store.getFloat(pageId, CROP_X)).toBe(0);
    expect(store.getFloat(pageId, CROP_Y)).toBe(0);
    expect(store.getFloat(pageId, CROP_WIDTH)).toBe(0);
    expect(store.getFloat(pageId, CROP_HEIGHT)).toBe(0);
  });

  it('block.resetCrop is a single undo operation', () => {
    const pageId = createPageWithImage(1920, 1080);
    const store = engine.getBlockStore();

    // Simulate a committed crop
    store.setProperty(pageId, PAGE_WIDTH, 960);
    store.setProperty(pageId, PAGE_HEIGHT, 540);
    store.setProperty(pageId, CROP_ENABLED, true);
    store.setProperty(pageId, CROP_WIDTH, 960);
    store.setProperty(pageId, CROP_HEIGHT, 540);

    // Clear history so resetCrop is the only entry
    engine.clearHistory();

    block.resetCrop(pageId);

    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1920);
    expect(store.getBool(pageId, CROP_ENABLED)).toBe(false);

    // Undo should restore the crop
    editor.undo();
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(960);
    expect(store.getBool(pageId, CROP_ENABLED)).toBe(true);
  });

  it('exit-mode auto-commit + undo + redo round-trips correctly', () => {
    const pageId = createPageWithImage(1080, 1080);
    block.select(pageId);
    editor.setEditMode('Crop');

    vi.mocked(renderer.getCropRect).mockReturnValue({ x: 0, y: 0, width: 1080, height: 607 });
    editor.setEditMode('Transform');

    const store = engine.getBlockStore();
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1080);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(607);

    editor.undo();
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1080);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(1080);
    expect(store.getBool(pageId, CROP_ENABLED)).toBe(false);

    editor.redo();
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1080);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(607);
    expect(store.getBool(pageId, CROP_ENABLED)).toBe(true);
  });
});

describe('BlockAPI — Image Rotation & Flip', () => {
  let engine: Engine;
  let block: BlockAPI;
  let editor: EditorAPI;
  let renderer: RendererAdapter;
  let pageId: number;

  beforeEach(() => {
    renderer = createMockRenderer();
    engine = new Engine({ renderer });
    block = new BlockAPI(engine);
    editor = new EditorAPI(engine);
    editor._setBlockAPI(block);

    // Create a page (1920 × 1080 landscape image)
    const store = engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, 'page');
    engine.exec(cmd);
    pageId = cmd.getCreatedId()!;
    store.setProperty(pageId, PAGE_WIDTH, 1920);
    store.setProperty(pageId, PAGE_HEIGHT, 1080);
    store.setProperty(pageId, IMAGE_SRC, 'test.jpg');
    store.setProperty(pageId, IMAGE_ORIGINAL_WIDTH, 1920);
    store.setProperty(pageId, IMAGE_ORIGINAL_HEIGHT, 1080);
  });

  // --- setImageRotation / getImageRotation ---

  it('default image rotation is 0', () => {
    expect(block.getImageRotation(pageId)).toBe(0);
  });

  it('sets and gets arbitrary rotation', () => {
    block.setImageRotation(pageId, 45);
    expect(block.getImageRotation(pageId)).toBe(45);
  });

  it('clamps rotation to [-180, 180]', () => {
    block.setImageRotation(pageId, 200);
    expect(block.getImageRotation(pageId)).toBe(180);

    block.setImageRotation(pageId, -270);
    expect(block.getImageRotation(pageId)).toBe(-180);
  });

  // --- rotateClockwise ---

  it('rotateClockwise rotates by +90° and swaps page dims', () => {
    block.rotateClockwise(pageId);
    const store = engine.getBlockStore();
    expect(block.getImageRotation(pageId)).toBe(90);
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1080);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(1920);
  });

  it('rotateClockwise wraps from 90→180 without dim swap', () => {
    block.rotateClockwise(pageId);
    block.rotateClockwise(pageId);
    const store = engine.getBlockStore();
    // 180° normalizes to -180 or 180
    const rot = block.getImageRotation(pageId);
    expect(Math.abs(rot)).toBe(180);
    // After two CW 90° rotations, dims should be back to original
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1920);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(1080);
  });

  it('rotateClockwise is undoable as a single batch', () => {
    block.rotateClockwise(pageId);
    expect(block.getImageRotation(pageId)).toBe(90);

    editor.undo();
    expect(block.getImageRotation(pageId)).toBe(0);
    const store = engine.getBlockStore();
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1920);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(1080);
  });

  // --- rotateCounterClockwise ---

  it('rotateCounterClockwise rotates by -90° and swaps page dims', () => {
    block.rotateCounterClockwise(pageId);
    const store = engine.getBlockStore();
    expect(block.getImageRotation(pageId)).toBe(-90);
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1080);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(1920);
  });

  // --- flipCropHorizontal / flipCropVertical ---

  it('flipCropHorizontal toggles the flip flag', () => {
    const store = engine.getBlockStore();
    expect(store.getBool(pageId, CROP_FLIP_HORIZONTAL)).toBe(false);

    block.flipCropHorizontal(pageId);
    expect(store.getBool(pageId, CROP_FLIP_HORIZONTAL)).toBe(true);

    block.flipCropHorizontal(pageId);
    expect(store.getBool(pageId, CROP_FLIP_HORIZONTAL)).toBe(false);
  });

  it('flipCropVertical toggles the flip flag', () => {
    const store = engine.getBlockStore();
    expect(store.getBool(pageId, CROP_FLIP_VERTICAL)).toBe(false);

    block.flipCropVertical(pageId);
    expect(store.getBool(pageId, CROP_FLIP_VERTICAL)).toBe(true);

    block.flipCropVertical(pageId);
    expect(store.getBool(pageId, CROP_FLIP_VERTICAL)).toBe(false);
  });

  // --- resetRotationAndFlip ---

  it('resetRotationAndFlip restores everything to defaults', () => {
    block.rotateClockwise(pageId);
    block.flipCropHorizontal(pageId);
    block.flipCropVertical(pageId);

    block.resetRotationAndFlip(pageId);
    const store = engine.getBlockStore();
    expect(block.getImageRotation(pageId)).toBe(0);
    expect(store.getBool(pageId, CROP_FLIP_HORIZONTAL)).toBe(false);
    expect(store.getBool(pageId, CROP_FLIP_VERTICAL)).toBe(false);
    // Dims restored from original image size
    expect(store.getFloat(pageId, PAGE_WIDTH)).toBe(1920);
    expect(store.getFloat(pageId, PAGE_HEIGHT)).toBe(1080);
  });

  it('resetRotationAndFlip is undoable as a single batch', () => {
    block.rotateClockwise(pageId);
    block.flipCropHorizontal(pageId);

    block.resetRotationAndFlip(pageId);
    expect(block.getImageRotation(pageId)).toBe(0);

    editor.undo();
    expect(block.getImageRotation(pageId)).toBe(90);
    expect(engine.getBlockStore().getBool(pageId, CROP_FLIP_HORIZONTAL)).toBe(true);
  });
});
