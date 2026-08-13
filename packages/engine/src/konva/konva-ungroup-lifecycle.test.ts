import Konva from "konva";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import { BlockStore } from "../block/block-store";
import { POSITION_X, POSITION_Y, SIZE_HEIGHT, SIZE_WIDTH } from "../block/property-keys";
import { EditxEngine } from "../editx-engine";
import type { BlockEvent } from "../event-api";

const createScene = vi.hoisted(() => vi.fn());

vi.mock("./konva-scene-setup", () => ({ createKonvaScene: createScene }));

import { KonvaRendererAdapter } from "./konva-renderer-adapter";

const originalResizeObserver = globalThis.ResizeObserver;

class NoopResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

describe("Konva ungroup lifecycle", () => {
  let nodeMap: Map<number, Konva.Node>;
  let contentLayer: Konva.Group;
  let uiLayer: Konva.Group;
  let hitIds: number[];

  beforeEach(() => {
    globalThis.ResizeObserver = NoopResizeObserver as unknown as typeof ResizeObserver;
    nodeMap = new Map();
    contentLayer = new Konva.Group();
    uiLayer = new Konva.Group();
    contentLayer.batchDraw = () => contentLayer;
    uiLayer.batchDraw = () => uiLayer;
    hitIds = [];

    const transformer = new Konva.Transformer();
    uiLayer.add(transformer);
    createScene.mockImplementation((_root, _width, _height, nodes: Map<number, Konva.Node>) => {
      nodeMap = nodes;
      return {
        stage: new Konva.Group(),
        contentLayer,
        uiLayer,
        transformer,
        updateAccentColor: vi.fn(),
        selectionRect: new Konva.Rect(),
        camera: {
          setPanChangeListener: vi.fn(),
          setPageSize: vi.fn(),
          getZoom: vi.fn(() => 1),
        },
        nodeFactory: {
          createNode: (id: number, block: BlockData) => {
            const node = block.type === "group" ? new Konva.Group() : new Konva.Rect();
            node.setAttrs({ blockId: id, isGroup: block.type === "group", isPage: false });
            node.on("click", () => hitIds.push(id));
            return node;
          },
          updateNode: (node: Konva.Node, block: BlockData) => {
            node.setAttrs({
              x: block.properties[POSITION_X] ?? 0,
              y: block.properties[POSITION_Y] ?? 0,
              width: block.properties[SIZE_WIDTH] ?? 0,
              height: block.properties[SIZE_HEIGHT] ?? 0,
            });
          },
        },
        cropOverlay: { isVisible: vi.fn(() => false), destroy: vi.fn() },
        webgl: null,
      };
    });
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    vi.clearAllMocks();
  });

  async function setup() {
    const store = new BlockStore();
    const pageId = store.create("page");
    const page = store.get(pageId) as BlockData;
    const adapter = new KonvaRendererAdapter();
    await adapter.init({} as HTMLElement);
    await adapter.createScene(page, page);
    adapter.resolveBlock = (id) => store.get(id);
    const engine = new EditxEngine({ renderer: adapter, blockStore: store });
    const firstId = engine.block.create("graphic");
    const secondId = engine.block.create("graphic");
    engine.block.appendChild(pageId, firstId);
    engine.block.appendChild(pageId, secondId);
    engine.block.setSize(firstId, 20, 10);
    engine.block.setSize(secondId, 30, 15);
    const groupId = engine.block.group([firstId, secondId]);
    engine.clearHistory();
    return { engine, store, pageId, firstId, secondId, groupId };
  }

  it("reparents live member nodes and preserves handlers through two undo/redo cycles", async () => {
    const { engine, pageId, firstId, secondId, groupId } = await setup();
    const firstNode = nodeMap.get(firstId) as Konva.Node;
    const secondNode = nodeMap.get(secondId) as Konva.Node;
    const events: BlockEvent[][] = [];
    engine.event.subscribe([], (batch) => events.push(batch));
    const hoverRect = uiLayer.find("Rect").find((node) => node.listening() === false) as Konva.Rect;

    engine.block.ungroup(groupId);

    expect(nodeMap.get(firstId)).toBe(firstNode);
    expect(nodeMap.get(secondId)).toBe(secondNode);
    expect(firstNode.getParent()).toBe(contentLayer);
    expect(secondNode.getParent()).toBe(contentLayer);
    expect(events.at(-1)).toEqual([
      { type: "updated", block: pageId },
      { type: "updated", block: firstId },
      { type: "updated", block: secondId },
      { type: "destroyed", block: groupId },
    ]);
    firstNode.fire("click");
    firstNode.fire("mouseenter", { target: firstNode }, false);
    expect(hitIds).toEqual([firstId]);
    expect(hoverRect.visible()).toBe(true);
    firstNode.fire("mouseleave", { target: firstNode }, false);
    expect(hoverRect.visible()).toBe(false);

    for (let cycle = 0; cycle < 2; cycle++) {
      engine.undo();
      const restoredGroup = nodeMap.get(groupId);
      expect(firstNode.getParent()).toBe(restoredGroup);
      expect(secondNode.getParent()).toBe(restoredGroup);
      expect(events.at(-1)?.map(({ type, block }) => [type, block])).toEqual([
        ["created", groupId],
        ["updated", secondId],
        ["updated", firstId],
        ["updated", pageId],
      ]);

      engine.redo();
      expect(nodeMap.get(firstId)).toBe(firstNode);
      expect(nodeMap.get(secondId)).toBe(secondNode);
      expect(firstNode.getParent()).toBe(contentLayer);
      expect(secondNode.getParent()).toBe(contentLayer);
      firstNode.fire("click");
      firstNode.fire("mouseenter", { target: firstNode }, false);
      expect(hoverRect.visible()).toBe(true);
      firstNode.fire("mouseleave", { target: firstNode }, false);
      expect(hoverRect.visible()).toBe(false);
    }
    expect(hitIds).toEqual([firstId, firstId, firstId]);
  });

  it("ordinary group deletion cascades through descendant blocks and renderer nodes", async () => {
    const { engine, store, firstId, secondId, groupId } = await setup();

    engine.block.destroy(groupId);

    for (const id of [groupId, firstId, secondId]) {
      expect(store.exists(id)).toBe(false);
      expect(nodeMap.has(id)).toBe(false);
    }
  });
});
