import { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageEditorConfig } from "../config/config.types";
import { useImageEditorStore } from "../store/image-editor-store";
import { useTextTool } from "./use-text-tool";

function setup() {
  const block = {
    getPageDimensions: vi.fn(() => ({ width: 540, height: 540 })),
    addText: vi.fn(() => 10),
    setTextAlign: vi.fn(),
    setTextLineHeight: vi.fn(),
    setTextGradient: vi.fn(),
    setTextStyle: vi.fn(),
    setTextAutoWidth: vi.fn(),
    select: vi.fn(),
  };
  const engine = { beginBatch: vi.fn(), endBatch: vi.fn(), block } as unknown as EditxEngine;
  const config = {
    text: {
      defaultFontSize: 20,
      presetGroups: [
        {
          id: "custom",
          label: "Custom",
          presets: [
            {
              id: "rich",
              label: "Rich",
              blocks: [
                {
                  text: "A😀BC",
                  fontSizeScale: 2,
                  fontWeight: "bold",
                  fill: "#123456",
                  backgroundColor: "#ff0",
                  backgroundOpacity: 0.5,
                  backgroundCornerRadius: 8,
                  backgroundPadding: { left: 6 },
                  runOverrides: [
                    { start: 3, end: 5, style: { fill: "#f00", fontSizeScale: 3 } },
                    { start: 1, end: 2, style: { fill: "#bad" } },
                    { start: 1, end: 3, style: { fontStyle: "italic" } },
                  ],
                },
              ],
              preview: { kind: "text", sample: "A😀BC" },
            },
          ],
        },
      ],
    },
  } satisfies ImageEditorConfig;
  return { engine, block, config };
}

beforeEach(() => useImageEditorStore.setState({ editableBlockId: 1 }));

describe("useTextTool rich preset insertion", () => {
  it("applies scaled base highlights and ordered valid overrides in one batch", () => {
    const { engine, block, config } = setup();
    const { result } = renderHook(() => useTextTool({ engineRef: { current: engine }, config }));

    act(() => result.current.handleAddTextPreset("rich"));

    expect(block.addText.mock.calls[0][6].style).toMatchObject({
      fontSize: 20,
      fontWeight: "bold",
      fill: "#123456",
      backgroundColor: "#ff0",
      backgroundOpacity: 0.5,
      backgroundCornerRadius: 4,
      backgroundPadding: { top: 0, right: 0, bottom: 0, left: 3 },
    });
    expect(block.setTextStyle.mock.calls).toEqual([
      [10, 3, 5, { fill: "#f00", fillGradient: null, fontSize: 30 }],
      [10, 1, 3, { fontStyle: "italic" }],
    ]);
    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
    expect(engine.beginBatch.mock.invocationCallOrder[0]).toBeLessThan(
      block.setTextStyle.mock.invocationCallOrder[0],
    );
    const lastStyleCall = block.setTextStyle.mock.invocationCallOrder.at(-1);
    expect(lastStyleCall).toBeDefined();
    expect(lastStyleCall).toBeLessThan(engine.endBatch.mock.invocationCallOrder[0]);
  });

  it("applies overlapping runs and inserts as one real-engine undo entry", () => {
    const engine = new EditxEngine({ renderer: undefined });
    const pageId = engine.block.create("page");
    engine.clearHistory();
    useImageEditorStore.setState({ editableBlockId: pageId });
    const realConfig = {
      text: {
        defaultFontSize: 24,
        presetGroups: [
          {
            id: "custom",
            label: "Custom",
            presets: [
              {
                id: "overlap",
                label: "Overlap",
                blocks: [
                  {
                    text: "ABCD",
                    fill: "#111111",
                    runOverrides: [
                      { start: 0, end: 3, style: { fill: "#ff0000" } },
                      { start: 1, end: 2, style: { fill: "#0000ff" } },
                    ],
                  },
                ],
                preview: { kind: "text", sample: "ABCD" },
              },
            ],
          },
        ],
      },
    } satisfies ImageEditorConfig;
    const { result } = renderHook(() =>
      useTextTool({ engineRef: { current: engine }, config: realConfig }),
    );

    act(() => result.current.handleAddTextPreset("overlap"));

    const [textId] = engine.block.findByType("text");
    expect(engine.block.getTextRuns(textId).map((run) => [run.text, run.style.fill])).toEqual([
      ["A", "#ff0000"],
      ["B", "#0000ff"],
      ["C", "#ff0000"],
      ["D", "#111111"],
    ]);
    expect(engine.canUndo()).toBe(true);

    engine.undo();
    expect(engine.block.exists(textId)).toBe(false);
    expect(engine.canUndo()).toBe(false);
  });

  it("creates real shape layers and removes the whole composition in one undo", () => {
    const engine = new EditxEngine({ renderer: undefined });
    const pageId = engine.block.create("page");
    engine.block.setSize(pageId, 1080, 1080);
    engine.clearHistory();
    useImageEditorStore.setState({ editableBlockId: pageId });
    const realConfig = {
      text: {
        presetGroups: [
          {
            id: "custom",
            label: "Custom",
            presets: [
              {
                id: "banner",
                label: "Banner",
                blocks: [{ text: "News", fill: "#ffffff" }],
                composition: {
                  elements: [
                    {
                      kind: "shape",
                      layout: { x: 0.1, y: 0.4, width: 0.8, height: 0.2 },
                      shape: { kind: "rect" },
                      fill: { kind: "color", color: "#dc2626" },
                    },
                    {
                      kind: "text",
                      block: 0,
                      layout: { x: 0.2, y: 0.45, width: 0.6, height: 0.1 },
                    },
                  ],
                },
                preview: { kind: "text", sample: "News" },
              },
            ],
          },
        ],
      },
    } satisfies ImageEditorConfig;
    const { result } = renderHook(() =>
      useTextTool({ engineRef: { current: engine }, config: realConfig }),
    );

    act(() => result.current.handleAddTextPreset("banner"));

    const [groupId] = engine.block.findByType("group");
    const children = engine.block.getChildren(groupId);
    expect(children.map((id) => engine.block.getType(id))).toEqual(["graphic", "text"]);
    expect(engine.block.getTextAutoWidth(children[1])).toBe(false);
    expect(engine.canUndo()).toBe(true);

    engine.undo();
    expect(engine.block.exists(groupId)).toBe(false);
    expect(children.every((id) => !engine.block.exists(id))).toBe(true);
    expect(engine.canUndo()).toBe(false);
  });
});
