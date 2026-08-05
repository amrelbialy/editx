import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import { KonvaCropOverlay } from "./konva-crop-overlay";
import { createStyledTransformer } from "./konva-transformer-style";

// Silence Konva's "node has no parent" moveToTop warning: the overlay is added
// to a lightweight layer stub, so its group has no real Konva parent chain.
Konva.showWarnings = false;

/**
 * Integration coverage for zoom-invariant interaction chrome.
 *
 * Unlike the pure-arithmetic helper tests, these drive the *real* Konva
 * `Transformer`/`Rect`/`Line` code paths (Konva shapes construct fine in the
 * node env; only Stage/Layer need a canvas backend, so we inject a lightweight
 * layer stub).
 *
 * Key invariant under test: a `Konva.Transformer` neutralizes the layer zoom
 * itself, so its anchors/border keep their **base** sizes at every zoom. The
 * previous implementation additionally multiplied by `1/zoom`, which
 * double-counted and ballooned the handles at low zoom — the regression these
 * tests now guard against.
 */

/** Minimal Konva.Layer stub: only the members the overlay/transformer touch. */
function makeLayerStub(scale: number) {
  let s = scale;
  return {
    add: vi.fn(),
    batchDraw: vi.fn(),
    scaleX: () => s,
    scaleY: () => s,
    position: () => ({ x: 0, y: 0 }),
    setScale: (next: number) => {
      s = next;
    },
  };
}

/** A settable Konva-anchor stub exposing the accessors anchorStyleFunc uses. */
function makeAnchorStub(name: string, layerScale: number) {
  const attrs: Record<string, unknown> = {};
  const val = <T>(init: T) => {
    let v = init;
    return (next?: T) => {
      if (next !== undefined) v = next;
      return v;
    };
  };
  return {
    name: () => name,
    width: val(0),
    height: val(0),
    cornerRadius: val(0),
    offsetX: val(0),
    offsetY: val(0),
    strokeWidth: val(0),
    fill: val(""),
    stroke: val(""),
    sceneFunc: vi.fn(),
    getAttr: (k: string) => attrs[k],
    setAttr: (k: string, v: unknown) => {
      attrs[k] = v;
    },
    getLayer: () => ({ scaleX: () => layerScale }),
  };
}

describe("block transformer anchorStyleFunc (real transformer)", () => {
  function styleFuncFor(zoom: number) {
    const uiLayer = makeLayerStub(zoom) as unknown as Konva.Layer;
    const { transformer } = createStyledTransformer(uiLayer);
    return transformer.anchorStyleFunc() as (a: Konva.Rect) => void;
  }

  it("keeps corner handles at their base size regardless of zoom", () => {
    const styleAt = (zoom: number) => {
      const anchor = makeAnchorStub("top-left _anchor", zoom);
      styleFuncFor(zoom)(anchor as unknown as Konva.Rect);
      return anchor;
    };
    // CORNER_SIZE = 10 — constant local size; Konva neutralizes the layer zoom.
    expect(styleAt(2).width()).toBeCloseTo(10);
    expect(styleAt(1).width()).toBeCloseTo(10);
    expect(styleAt(0.5).width()).toBeCloseTo(10);
    expect(styleAt(0.13).width()).toBeCloseTo(10);
  });

  it("keeps side pill handles at their base size", () => {
    const anchor = makeAnchorStub("middle-left _anchor", 0.2);
    styleFuncFor(0.2)(anchor as unknown as Konva.Rect);
    // PILL_SHORT = 6, PILL_LONG = 20 — unchanged by zoom.
    expect(anchor.width()).toBeCloseTo(6);
    expect(anchor.height()).toBeCloseTo(20);
  });

  it("keeps the rotater handle at its base size", () => {
    const anchor = makeAnchorStub("rotater _anchor", 0.2);
    styleFuncFor(0.2)(anchor as unknown as Konva.Rect);
    // ROTATE_SIZE = 24 — unchanged by zoom.
    expect(anchor.width()).toBeCloseTo(24);
    expect(anchor.height()).toBeCloseTo(24);
  });

  it("keeps the anchor stroke width at its base size", () => {
    const anchor = makeAnchorStub("top-left _anchor", 0.1);
    styleFuncFor(0.1)(anchor as unknown as Konva.Rect);
    expect(anchor.strokeWidth()).toBeCloseTo(2);
  });
});

describe("crop overlay sizing across zoom", () => {
  function makeOverlay(scale: number) {
    const layer = makeLayerStub(scale);
    const overlay = new KonvaCropOverlay(layer as unknown as Konva.Layer);
    return { overlay, layer };
  }

  /** Reach the real internal Konva nodes via the layer.add() spy. */
  function internals(layer: ReturnType<typeof makeLayerStub>) {
    const group = layer.add.mock.calls[0][0] as Konva.Group;
    return {
      transformer: group.findOne("Transformer") as Konva.Transformer,
      cutout: group.findOne(".crop-cutout") as Konva.Rect,
    };
  }

  it("keeps crop transformer handles at base size when shown while zoomed", () => {
    const { overlay, layer } = makeOverlay(0.2);
    overlay.show({ x: 0, y: 0, width: 200, height: 100 });

    const { transformer } = internals(layer);
    // Base sizes are preserved — the transformer neutralizes the 0.2 layer zoom.
    expect(transformer.anchorSize()).toBeCloseTo(12);
    expect(transformer.anchorStrokeWidth()).toBeCloseTo(2);
    expect(transformer.borderStrokeWidth()).toBeCloseTo(2);
  });

  it("counter-scales the plain cutout stroke by 1/zoom when shown while zoomed", () => {
    const { overlay, layer } = makeOverlay(2);
    overlay.show({ x: 0, y: 0, width: 200, height: 100 });

    const { cutout } = internals(layer);
    // Cutout is a plain Rect on the zoom-scaled layer → stroke 2 / 2 = 1.
    expect(cutout.strokeWidth()).toBeCloseTo(1);
  });

  it("re-sizes the cutout stroke when the layer scale changes", () => {
    const { overlay, layer } = makeOverlay(1);
    overlay.show({ x: 0, y: 0, width: 200, height: 100 });
    const { cutout, transformer } = internals(layer);
    expect(cutout.strokeWidth()).toBeCloseTo(2);
    expect(transformer.anchorSize()).toBeCloseTo(12);

    layer.setScale(4);
    overlay.applyViewportScale(4);
    // Plain stroke follows 1/zoom; transformer handles stay at base size.
    expect(cutout.strokeWidth()).toBeCloseTo(0.5); // 2 / 4
    expect(transformer.anchorSize()).toBeCloseTo(12);
  });
});
