/**
 * @vitest-environment node
 *
 * Export/rasterization determinism for `exportScene`. No real Konva stage is
 * needed — we drive a minimal fake stage/layer double that records the
 * `toDataURL` options and layer state so we can assert:
 *   - identical inputs produce byte-identical Blobs (idempotent),
 *   - the UI layer is hidden during export and restored afterwards (incl. on
 *     the error path via `finally`),
 *   - content-layer transform is neutralised during export and restored,
 *   - pixelRatio is forwarded to the rasterizer.
 */

import type Konva from "konva";
import { describe, expect, it } from "vitest";
import { exportScene } from "./konva-export";

interface FakeLayerState {
  visible: boolean;
  scaleX: number;
  scaleY: number;
  x: number;
  y: number;
}

/** A minimal Konva.Layer double exposing only what exportScene touches. */
function makeLayer(initial: Partial<FakeLayerState> = {}): Konva.Layer & { state: FakeLayerState } {
  const state: FakeLayerState = {
    visible: initial.visible ?? true,
    scaleX: initial.scaleX ?? 1,
    scaleY: initial.scaleY ?? 1,
    x: initial.x ?? 0,
    y: initial.y ?? 0,
  };
  const accessor =
    <K extends keyof FakeLayerState>(key: K) =>
    (v?: FakeLayerState[K]) => {
      if (v === undefined) return state[key];
      state[key] = v;
      return undefined;
    };
  return {
    state,
    visible: accessor("visible"),
    scaleX: accessor("scaleX"),
    scaleY: accessor("scaleY"),
    x: accessor("x"),
    y: accessor("y"),
  } as unknown as Konva.Layer & { state: FakeLayerState };
}

/**
 * A fake stage whose toDataURL emits a deterministic data URL encoding the
 * options it received, so repeated calls with identical options are identical.
 */
function makeStage(opts: {
  captureUiVisibleDuringExport?: (visible: boolean) => void;
  uiLayer: Konva.Layer & { state: FakeLayerState };
  throwOnExport?: boolean;
}): { stage: Konva.Stage; calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  const stage = {
    toDataURL(cfg: Record<string, unknown>) {
      calls.push(cfg);
      opts.captureUiVisibleDuringExport?.(opts.uiLayer.state.visible);
      if (opts.throwOnExport) throw new Error("boom");
      // PNG bytes are just the JSON of the deterministic inputs, base64'd.
      const payload = JSON.stringify(cfg);
      const b64 = Buffer.from(payload, "utf8").toString("base64");
      return `data:image/png;base64,${b64}`;
    },
  } as unknown as Konva.Stage;
  return { stage, calls };
}

const PAGE = { width: 800, height: 600 };

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

describe("exportScene", () => {
  it("produces byte-identical output for identical inputs (idempotent)", async () => {
    const content = makeLayer({ scaleX: 2, x: 40 });
    const ui = makeLayer();
    const { stage } = makeStage({ uiLayer: ui });

    const b1 = await exportScene(stage, content, ui, PAGE, { format: "png", pixelRatio: 2 });
    const b2 = await exportScene(stage, content, ui, PAGE, { format: "png", pixelRatio: 2 });

    expect(await blobBytes(b1)).toEqual(await blobBytes(b2));
    expect(b1.type).toBe("image/png");
  });

  it("hides the UI layer during export and restores it afterwards", async () => {
    const content = makeLayer();
    const ui = makeLayer({ visible: true });
    let uiVisibleDuringExport = true;
    const { stage } = makeStage({
      uiLayer: ui,
      captureUiVisibleDuringExport: (v) => {
        uiVisibleDuringExport = v;
      },
    });

    await exportScene(stage, content, ui, PAGE, { format: "png" });

    expect(uiVisibleDuringExport).toBe(false); // hidden during rasterization
    expect(ui.state.visible).toBe(true); // restored after
  });

  it("restores UI visibility and content transform even when export throws", async () => {
    const content = makeLayer({ scaleX: 3, scaleY: 3, x: 10, y: 20 });
    const ui = makeLayer({ visible: true });
    const { stage } = makeStage({ uiLayer: ui, throwOnExport: true });

    await expect(exportScene(stage, content, ui, PAGE, { format: "png" })).rejects.toThrow("boom");

    // finally block restores everything
    expect(ui.state.visible).toBe(true);
    expect(content.state.scaleX).toBe(3);
    expect(content.state.scaleY).toBe(3);
    expect(content.state.x).toBe(10);
    expect(content.state.y).toBe(20);
  });

  it("neutralises content-layer transform during export, then restores it", async () => {
    const content = makeLayer({ scaleX: 2.5, scaleY: 2.5, x: 100, y: 50 });
    const ui = makeLayer();
    let transformDuringExport: FakeLayerState | null = null;
    const stageObj = {
      toDataURL(cfg: Record<string, unknown>) {
        transformDuringExport = { ...content.state };
        void cfg;
        return "data:image/png;base64,QUJD";
      },
    } as unknown as Konva.Stage;

    await exportScene(stageObj, content, ui, PAGE, { format: "png" });

    expect(transformDuringExport).not.toBeNull();
    expect(transformDuringExport?.scaleX).toBe(1);
    expect(transformDuringExport?.scaleY).toBe(1);
    expect(transformDuringExport?.x).toBe(0);
    expect(transformDuringExport?.y).toBe(0);
    // restored
    expect(content.state.scaleX).toBe(2.5);
    expect(content.state.x).toBe(100);
  });

  it("forwards pixelRatio and page size to the rasterizer", async () => {
    const content = makeLayer();
    const ui = makeLayer();
    const { stage, calls } = makeStage({ uiLayer: ui });

    await exportScene(stage, content, ui, PAGE, { format: "jpeg", pixelRatio: 3, quality: 0.5 });

    expect(calls).toHaveLength(1);
    expect(calls[0].pixelRatio).toBe(3);
    expect(calls[0].width).toBe(PAGE.width);
    expect(calls[0].height).toBe(PAGE.height);
    expect(calls[0].mimeType).toBe("image/jpeg");
    expect(calls[0].quality).toBe(0.5); // quality applied for non-png
  });

  it("omits quality for png exports", async () => {
    const content = makeLayer();
    const ui = makeLayer();
    const { stage, calls } = makeStage({ uiLayer: ui });

    await exportScene(stage, content, ui, PAGE, { format: "png", quality: 0.3 });

    expect(calls[0].quality).toBeUndefined();
  });

  it("defaults to png / pixelRatio 1 when options are omitted", async () => {
    const content = makeLayer();
    const ui = makeLayer();
    const { stage, calls } = makeStage({ uiLayer: ui });

    await exportScene(stage, content, ui, PAGE, {});

    expect(calls[0].pixelRatio).toBe(1);
    expect(calls[0].mimeType).toBe("image/png");
  });
});
