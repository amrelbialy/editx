import { describe, it, expect, beforeEach } from 'vitest';
import { SceneAPI } from './scene';
import { BlockAPI } from './block/block-api';
import { Engine } from './engine';
import { createMockRenderer } from './__tests__/mocks/mock-renderer';
import type { RendererAdapter } from './render-adapter';

describe('SceneAPI', () => {
  let engine: Engine;
  let block: BlockAPI;
  let scene: SceneAPI;
  let renderer: RendererAdapter;

  beforeEach(() => {
    renderer = createMockRenderer();
    engine = new Engine({ renderer });
    block = new BlockAPI(engine);
    scene = new SceneAPI(engine, block);
  });

  describe('create', () => {
    it('creates a scene and a page', async () => {
      await scene.create();

      expect(scene.getScene()).not.toBeNull();
      expect(scene.getCurrentPage()).not.toBeNull();
    });

    it('uses default dimensions (1080x1080)', async () => {
      await scene.create();

      const sceneId = scene.getScene()!;
      expect(block.getFloat(sceneId, 'scene/width')).toBe(1080);
      expect(block.getFloat(sceneId, 'scene/height')).toBe(1080);
    });

    it('uses custom dimensions', async () => {
      await scene.create({ width: 800, height: 600 });

      const sceneId = scene.getScene()!;
      expect(block.getFloat(sceneId, 'scene/width')).toBe(800);
      expect(block.getFloat(sceneId, 'scene/height')).toBe(600);

      const pageId = scene.getCurrentPage()!;
      expect(block.getFloat(pageId, 'page/width')).toBe(800);
      expect(block.getFloat(pageId, 'page/height')).toBe(600);
    });

    it('calls renderer.createScene', async () => {
      await scene.create();
      expect(renderer.createScene).toHaveBeenCalled();
    });

    it('clears history after create (scene creation is not undoable)', async () => {
      await scene.create();
      expect(engine.canUndo()).toBe(false);
    });

    it('page is child of scene', async () => {
      await scene.create();
      const sceneId = scene.getScene()!;
      const pageId = scene.getCurrentPage()!;
      expect(block.getChildren(sceneId)).toContain(pageId);
      expect(block.getParent(pageId)).toBe(sceneId);
    });
  });

  describe('getScene / getCurrentPage', () => {
    it('returns null before create', () => {
      expect(scene.getScene()).toBeNull();
      expect(scene.getCurrentPage()).toBeNull();
    });
  });

  describe('getPages', () => {
    it('returns empty array before create', () => {
      expect(scene.getPages()).toEqual([]);
    });

    it('returns the initial page after create', async () => {
      await scene.create();
      const pages = scene.getPages();
      expect(pages).toHaveLength(1);
      expect(pages[0]).toBe(scene.getCurrentPage());
    });
  });

  describe('addPage', () => {
    it('adds a new page to the scene', async () => {
      await scene.create();
      const newPageId = scene.addPage();
      const pages = scene.getPages();
      expect(pages).toHaveLength(2);
      expect(pages).toContain(newPageId);
    });

    it('uses scene dimensions by default', async () => {
      await scene.create({ width: 500, height: 400 });
      const newPageId = scene.addPage();
      expect(block.getFloat(newPageId, 'page/width')).toBe(500);
      expect(block.getFloat(newPageId, 'page/height')).toBe(400);
    });

    it('uses custom dimensions when provided', async () => {
      await scene.create();
      const newPageId = scene.addPage({ width: 200, height: 150 });
      expect(block.getFloat(newPageId, 'page/width')).toBe(200);
      expect(block.getFloat(newPageId, 'page/height')).toBe(150);
    });

    it('throws if no active scene', () => {
      expect(() => scene.addPage()).toThrow('No active scene');
    });
  });

  describe('setActivePage', () => {
    it('changes the active page', async () => {
      await scene.create();
      const newPageId = scene.addPage();
      scene.setActivePage(newPageId);
      expect(scene.getCurrentPage()).toBe(newPageId);
    });
  });
});
