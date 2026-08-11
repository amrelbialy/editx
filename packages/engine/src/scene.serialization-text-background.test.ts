/**
 * Serialization / back-compat guards for the text background box: the seven
 * `text/background/*` keys are strictly additive — never seeded, so pre-change
 * documents (and fresh blocks) serialize exactly as before.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import type { Color } from "./block/block.types";
import { BlockAPI } from "./block/block-api";
import {
  FILL_COLOR,
  TEXT_BACKGROUND_COLOR,
  TEXT_BACKGROUND_CORNER_RADIUS,
  TEXT_BACKGROUND_ENABLED,
  TEXT_BACKGROUND_PADDING_BOTTOM,
  TEXT_BACKGROUND_PADDING_LEFT,
  TEXT_BACKGROUND_PADDING_RIGHT,
  TEXT_BACKGROUND_PADDING_TOP,
  TEXT_RUNS,
} from "./block/property-keys";
import { EditxEngine } from "./editx-engine";
import type { FormattedText } from "./konva/formatted-text";
import { updateTextNode } from "./konva/konva-text-updater";
import { SceneAPI } from "./scene";

const RED: Color = { r: 1, g: 0, b: 0, a: 1 };

function freshScene(): { block: BlockAPI; scene: SceneAPI } {
  const engine = new EditxEngine({ renderer: createMockRenderer() });
  const block = new BlockAPI(engine);
  const scene = new SceneAPI(engine, block);
  return { block, scene };
}

describe("SceneAPI — text background serialization", () => {
  let block: BlockAPI;
  let scene: SceneAPI;

  beforeEach(() => {
    ({ block, scene } = freshScene());
  });

  it("fresh text blocks do not serialize text/background keys", async () => {
    await scene.create();
    const pageId = scene.getCurrentPage()!;
    const txt = block.create("text");
    block.appendChild(pageId, txt);

    expect(scene.saveToString()).not.toContain("text/background");
  });

  it("saveToString stays version 2 and text background keys are additive-only", async () => {
    await scene.create();
    const pageId = scene.getCurrentPage()!;
    const txt = block.create("text");
    block.appendChild(pageId, txt);
    block.setTextBackground(txt, {
      enabled: true,
      color: RED,
      cornerRadius: 14,
      padding: { top: 1, right: 2, bottom: 3, left: 4 },
    });
    const original = block.getTextBackground(txt);

    const json = scene.saveToString();
    expect(JSON.parse(json).version).toBe(2);

    const { block: block2, scene: scene2 } = freshScene();
    await scene2.loadFromString(json);

    const pageId2 = scene2.getCurrentPage()!;
    const txt2 = block2.getChildren(pageId2).find((id) => block2.getType(id) === "text")!;
    expect(block2.getTextBackground(txt2)).toEqual(original);
    expect(original).toEqual({
      enabled: true,
      color: RED,
      cornerRadius: 14,
      padding: { top: 1, right: 2, bottom: 3, left: 4 },
    });
  });

  it("a scene saved by the pre-change shape still loads unchanged", async () => {
    await scene.create();
    const pageId = scene.getCurrentPage()!;
    const txt = block.create("text");
    block.appendChild(pageId, txt);
    block.setString(txt, "text/content", "Legacy");

    // Strip every text/background key to emulate a pre-change document.
    const payload = JSON.parse(scene.saveToString());
    for (const entry of payload.blocks) {
      for (const key of Object.keys(entry.properties ?? {})) {
        if (key.startsWith("text/background/")) delete entry.properties[key];
      }
    }

    const { block: block2, scene: scene2 } = freshScene();
    await expect(scene2.loadFromString(JSON.stringify(payload))).resolves.toBeUndefined();

    const pageId2 = scene2.getCurrentPage()!;
    const txt2 = block2.getChildren(pageId2).find((id) => block2.getType(id) === "text")!;
    expect(block2.getString(txt2, "text/content")).toBe("Legacy");
    expect(block2.getTextBackground(txt2)).toEqual({
      enabled: false,
      color: { r: 0, g: 0, b: 0, a: 1 },
      cornerRadius: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    expect(block2.isTextBackgroundEnabled(txt2)).toBe(false);
  });
});

/** Captures the runs handed to the node so the glyph fill can be asserted. */
function makeTextNodeProbe(): { node: FormattedText; runs: () => unknown[] } {
  const captured: unknown[] = [];
  const noop = () => undefined;
  const node = {
    textRuns: (v: unknown[]) => {
      captured.push(...v);
    },
    width: noop,
    align: noop,
    lineHeight: noop,
    verticalAlign: noop,
    padding: noop,
    wrap: noop,
    curveRadius: noop,
    curveDirection: noop,
    height: noop,
    shadowEnabled: noop,
    getComputedHeight: () => 42,
    getAttr: () => undefined,
    setAttr: noop,
  } as unknown as FormattedText;
  return { node, runs: () => captured };
}

describe("updateTextNode legacy fallback", () => {
  it("fill/color remains the glyph fallback when text/runs is empty", () => {
    const probe = makeTextNodeProbe();

    updateTextNode(
      probe.node,
      {
        [TEXT_RUNS]: [],
        [FILL_COLOR]: RED,
        // Background box keys must not divert the glyph fallback.
        [TEXT_BACKGROUND_ENABLED]: true,
        [TEXT_BACKGROUND_COLOR]: { r: 0, g: 0, b: 1, a: 1 },
        [TEXT_BACKGROUND_CORNER_RADIUS]: 8,
        [TEXT_BACKGROUND_PADDING_TOP]: 4,
        [TEXT_BACKGROUND_PADDING_RIGHT]: 4,
        [TEXT_BACKGROUND_PADDING_BOTTOM]: 4,
        [TEXT_BACKGROUND_PADDING_LEFT]: 4,
      },
      100,
      50,
    );

    const runs = probe.runs() as Array<{ style: { fill?: string } }>;
    expect(runs).toHaveLength(1);
    expect(runs[0].style.fill).toBe("#ff0000");
  });
});
