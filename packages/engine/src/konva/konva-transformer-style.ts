import Konva from "konva";
import { setupEdgeHover } from "./konva-transformer-edge-hover";
import { rotaterSceneFunc } from "./konva-transformer-rotater";
import { EDGE_HIT_WIDTH } from "./konva-transformer-scale";

// ── Design tokens ──────────────────────────────────────────────────
const DEFAULT_ACCENT = "#2563eb";
const ANCHOR_FILL = "#ffffff";
const ANCHOR_STROKE_W = 2;

const CORNER_SIZE = 10;
const PILL_LONG = 20;
const PILL_SHORT = 6;
const ROTATE_SIZE = 24;

const HOVER_STROKE = "#ffffff";

// ── Anchor name helpers ────────────────────────────────────────────
const CORNER_ANCHORS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
const VERTICAL_PILL_ANCHORS = new Set(["middle-left", "middle-right"]);
const HORIZONTAL_PILL_ANCHORS = new Set(["top-center", "bottom-center"]);

function anchorId(anchor: Konva.Rect): string {
  return (anchor.name() || "").replace(" _anchor", "").trim();
}

// ── Main setup ─────────────────────────────────────────────────────

/**
 * Creates a fully styled Konva.Transformer matching the block-based editor look:
 * circular corner handles, pill-shaped side handles, a rotation handle
 * with an embedded rotate icon, border-edge hover with pill highlighting,
 * and move cursor on border hover.
 */
export interface StyledTransformerResult {
  transformer: Konva.Transformer;
  updateAccent: (color: string) => void;
}

export function createStyledTransformer(uiLayer: Konva.Layer): StyledTransformerResult {
  let accent = DEFAULT_ACCENT;
  const anchorMap = new Map<string, Konva.Rect>();

  const transformer = new Konva.Transformer({
    rotateEnabled: true,
    rotateLineVisible: false,
    rotateAnchorOffset: 30,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    rotationSnapTolerance: 5,

    borderStroke: accent,
    borderStrokeWidth: 2,

    anchorFill: ANCHOR_FILL,
    anchorStroke: accent,
    anchorStrokeWidth: ANCHOR_STROKE_W,
    anchorSize: CORNER_SIZE,
    anchorCornerRadius: CORNER_SIZE / 2,

    enabledAnchors: [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "middle-left",
      "middle-right",
      "top-center",
      "bottom-center",
    ],

    anchorStyleFunc: (anchor: Konva.Rect) => {
      const id = anchorId(anchor);
      anchorMap.set(id, anchor);

      // Konva neutralizes the layer zoom on the transformer, so these sizes are
      // already screen-constant px — no 1/zoom compensation.
      anchor.strokeWidth(ANCHOR_STROKE_W);
      if (anchor.getAttr("_hovered")) {
        anchor.fill(accent);
        anchor.stroke(HOVER_STROKE);
      } else {
        anchor.fill(ANCHOR_FILL);
        anchor.stroke(accent);
      }

      if (CORNER_ANCHORS.has(id)) {
        anchor.width(CORNER_SIZE);
        anchor.height(CORNER_SIZE);
        anchor.cornerRadius(CORNER_SIZE / 2);
        anchor.offsetX(CORNER_SIZE / 2);
        anchor.offsetY(CORNER_SIZE / 2);
      } else if (VERTICAL_PILL_ANCHORS.has(id)) {
        anchor.width(PILL_SHORT);
        anchor.height(PILL_LONG);
        anchor.cornerRadius(PILL_SHORT / 2);
        anchor.offsetX(PILL_SHORT / 2);
        anchor.offsetY(PILL_LONG / 2);
      } else if (HORIZONTAL_PILL_ANCHORS.has(id)) {
        anchor.width(PILL_LONG);
        anchor.height(PILL_SHORT);
        anchor.cornerRadius(PILL_SHORT / 2);
        anchor.offsetX(PILL_LONG / 2);
        anchor.offsetY(PILL_SHORT / 2);
      } else if (id === "rotater") {
        anchor.width(ROTATE_SIZE);
        anchor.height(ROTATE_SIZE);
        anchor.cornerRadius(ROTATE_SIZE / 2);
        anchor.offsetX(ROTATE_SIZE / 2);
        anchor.offsetY(ROTATE_SIZE / 2);
        // Draw the circle + icon in one pass — no separate overlay needed
        anchor.sceneFunc(rotaterSceneFunc as any);
      }
    },

    boundBoxFunc: (oldBox, newBox) => {
      const MIN_SIZE = 20;
      if (Math.abs(newBox.width) < MIN_SIZE || Math.abs(newBox.height) < MIN_SIZE) {
        return oldBox;
      }
      return newBox;
    },
  });

  // ── Helpers ───────────────────────────────────────────────────
  function setHovered(id: string, hovered: boolean) {
    const anchor = anchorMap.get(id);
    if (!anchor) return;
    anchor.setAttr("_hovered", hovered);
    anchor.fill(hovered ? accent : ANCHOR_FILL);
    anchor.stroke(hovered ? HOVER_STROKE : accent);
  }

  // ── Hover highlighting on anchors ─────────────────────────────
  let hoverBound = false;

  function bindHoverEvents() {
    if (hoverBound) return;
    const children = (transformer as any).children as Konva.Node[] | undefined;
    if (!children || children.length === 0) return;

    for (const child of children) {
      if (!(child instanceof Konva.Rect)) continue;
      const id = anchorId(child);
      if (!id) continue;

      child.on("mouseenter", () => {
        setHovered(id, true);
        child.getLayer()?.batchDraw();
      });
      child.on("mouseleave", () => {
        setHovered(id, false);
        child.getLayer()?.batchDraw();
      });

      // Expand pill hit areas to cover the border edge minus corner zones (set once, not in anchorStyleFunc).
      // Inset by CORNER_SIZE on each end so corners keep their own resize behavior.
      // Sizes are raw screen px — the transformer's local space is already 1:1 with screen.
      if (VERTICAL_PILL_ANCHORS.has(id)) {
        child.hitFunc((ctx: any, shape: any) => {
          const back = transformer.findOne(".back") as Konva.Shape | undefined;
          const edgeH = back ? back.height() : PILL_LONG;
          const insetH = Math.max(edgeH - CORNER_SIZE * 2, PILL_LONG);
          const hitW = EDGE_HIT_WIDTH;
          ctx.beginPath();
          ctx.rect((PILL_SHORT - hitW) / 2, (PILL_LONG - insetH) / 2, hitW, insetH);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        });
      } else if (HORIZONTAL_PILL_ANCHORS.has(id)) {
        child.hitFunc((ctx: any, shape: any) => {
          const back = transformer.findOne(".back") as Konva.Shape | undefined;
          const edgeW = back ? back.width() : PILL_LONG;
          const insetW = Math.max(edgeW - CORNER_SIZE * 2, PILL_LONG);
          const hitH = EDGE_HIT_WIDTH;
          ctx.beginPath();
          ctx.rect((PILL_LONG - insetW) / 2, (PILL_SHORT - hitH) / 2, insetW, hitH);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        });
      }
    }

    // Make the border edges show hover feedback (pill highlights + cursor)
    setupEdgeHover(transformer, uiLayer, setHovered);

    hoverBound = true;
  }

  transformer.on("transformstart", () => bindHoverEvents());
  (transformer as any)._bindHoverEvents = () => setTimeout(bindHoverEvents, 0);
  (transformer as any)._styleCleanup = () => {};

  function updateAccent(color: string) {
    accent = color;
    transformer.borderStroke(accent);
    transformer.anchorStroke(accent);
    // Update the accent attr on the rotater for sceneFunc
    const rotater = anchorMap.get("rotater");
    if (rotater) rotater.setAttr("_accent", accent);
    // Re-apply to all non-hovered anchors
    for (const [, anchor] of anchorMap) {
      if (!anchor.getAttr("_hovered")) {
        anchor.stroke(accent);
      } else {
        anchor.fill(accent);
      }
    }
    uiLayer.batchDraw();
  }

  return { transformer, updateAccent };
}
