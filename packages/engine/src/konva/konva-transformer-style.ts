import Konva from "konva";

// ── Design tokens ──────────────────────────────────────────────────
const ACCENT = "#2563eb";
const ANCHOR_FILL = "#ffffff";
const ANCHOR_STROKE_W = 2;

const CORNER_SIZE = 10;
const PILL_LONG = 20;
const PILL_SHORT = 6;
const ROTATE_SIZE = 24;

const HOVER_FILL = ACCENT;
const HOVER_STROKE = "#ffffff";
const EDGE_HIT_WIDTH = 12;

// ── Anchor name helpers ────────────────────────────────────────────
const CORNER_ANCHORS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
const VERTICAL_PILL_ANCHORS = new Set(["middle-left", "middle-right"]);
const HORIZONTAL_PILL_ANCHORS = new Set(["top-center", "bottom-center"]);

function anchorId(anchor: Konva.Rect): string {
 return (anchor.name() || "").replace(" _anchor", "").trim();
}

// ── Rotater sceneFunc ──────────────────────────────────────────────
// Draw the circle background + Lucide refresh-cw icon in one pass.
// Uses Path2D with the raw SVG path data for pixel-perfect rendering.

const REFRESH_CW_PATHS = [
 "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
 "M21 3v5h-5",
 "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
 "M8 16H3v5",
];

// Pre-build Path2D objects once (supported in all modern browsers)
let cachedPaths: Path2D[] | null = null;
function getRefreshPaths(): Path2D[] {
 if (!cachedPaths) {
 cachedPaths = REFRESH_CW_PATHS.map((d) => new Path2D(d));
 }
 return cachedPaths;
}

function rotaterSceneFunc(ctx: Konva.Context, shape: Konva.Rect) {
 const w = shape.width();
 const h = shape.height();

 // Circle background
 ctx.beginPath();
 ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
 ctx.closePath();
 ctx.fillStrokeShape(shape);

 // Lucide refresh-cw icon (24×24 viewBox → scaled to ~14px)
 const native = ctx._context;
 native.save();

 const iconSize = 14;
 const scale = iconSize / 24;
 native.translate((w - iconSize) / 2, (h - iconSize) / 2);
 native.scale(scale, scale);

 native.strokeStyle = ACCENT;
 native.lineWidth = 2;
 native.lineCap = "round";
 native.lineJoin = "round";

 for (const p of getRefreshPaths()) {
 native.stroke(p);
 }

 native.restore();
}

// ── Main setup ─────────────────────────────────────────────────────

/**
 * Creates a fully styled Konva.Transformer matching the block-based editor look:
 * circular corner handles, pill-shaped side handles, a rotation handle
 * with an embedded rotate icon, border-edge hover with pill highlighting,
 * and move cursor on border hover.
 */
export function createStyledTransformer(uiLayer: Konva.Layer): Konva.Transformer {
 const anchorMap = new Map<string, Konva.Rect>();

 const transformer = new Konva.Transformer({
 rotateEnabled: true,
 rotateLineVisible: false,
 rotateAnchorOffset: 0,
 rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
 rotationSnapTolerance: 5,

 borderStroke: ACCENT,
 borderStrokeWidth: 2,

 anchorFill: ANCHOR_FILL,
 anchorStroke: ACCENT,
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

 anchor.stroke(ACCENT);
 anchor.strokeWidth(ANCHOR_STROKE_W);
 if (!anchor.getAttr("_hovered")) {
 anchor.fill(ANCHOR_FILL);
 anchor.stroke(ACCENT);
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
 // Position below the shape instead of above
 const back = transformer.findOne(".back") as Konva.Shape | undefined;
 if (back) {
 const bh = back.height();
 anchor.y(bh + 30);
 anchor.x(back.width() / 2);
 }
 // Draw the circle + icon in one pass — no separate overlay needed
 anchor.sceneFunc(rotaterSceneFunc as any);
 }
 },
 });

 // ── Helpers ───────────────────────────────────────────────────
 function setHovered(id: string, hovered: boolean) {
 const anchor = anchorMap.get(id);
 if (!anchor) return;
 anchor.setAttr("_hovered", hovered);
 anchor.fill(hovered ? HOVER_FILL : ANCHOR_FILL);
 anchor.stroke(hovered ? HOVER_STROKE : ACCENT);
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
 if (VERTICAL_PILL_ANCHORS.has(id)) {
 child.hitFunc((ctx: any, shape: any) => {
 const back = transformer.findOne(".back") as Konva.Shape | undefined;
 const edgeH = back ? back.height() : PILL_LONG;
 const insetH = Math.max(edgeH - CORNER_SIZE * 2, PILL_LONG);
 ctx.beginPath();
 ctx.rect(
 (PILL_SHORT - EDGE_HIT_WIDTH) / 2,
 (PILL_LONG - insetH) / 2,
 EDGE_HIT_WIDTH,
 insetH,
 );
 ctx.closePath();
 ctx.fillStrokeShape(shape);
 });
 } else if (HORIZONTAL_PILL_ANCHORS.has(id)) {
 child.hitFunc((ctx: any, shape: any) => {
 const back = transformer.findOne(".back") as Konva.Shape | undefined;
 const edgeW = back ? back.width() : PILL_LONG;
 const insetW = Math.max(edgeW - CORNER_SIZE * 2, PILL_LONG);
 ctx.beginPath();
 ctx.rect(
 (PILL_LONG - insetW) / 2,
 (PILL_SHORT - EDGE_HIT_WIDTH) / 2,
 insetW,
 EDGE_HIT_WIDTH,
 );
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

 return transformer;
}

// ── Border edge hover detection ────────────────────────────────────

/**
 * Detect when the cursor is near a transformer border edge and:
 * - Show a move cursor.
 * - Highlight the corresponding center pill anchor.
 *
 * This uses a mousemove listener on the stage (not on the back shape)
 * to avoid stealing mouse events from the resize anchors. The underlying
 * block is already draggable, so clicking near the border naturally
 * allows moving the block.
 */
function setupEdgeHover(
 transformer: Konva.Transformer,
 uiLayer: Konva.Layer,
 setHovered: (id: string, hovered: boolean) => void,
) {
 const stage = uiLayer.getStage();
 if (!stage) return;

 let lastPill = "";
 let wasOnEdge = false;

 stage.on("mousemove.transformerEdge", () => {
 // Only active when the transformer has nodes
 if (transformer.nodes().length === 0) {
 if (wasOnEdge) clearEdgeState();
 return;
 }

 const pointer = stage.getPointerPosition();
 if (!pointer) return;

 const back = transformer.findOne(".back") as Konva.Shape | undefined;
 if (!back) return;

 // Convert screen position to back-local coordinates
 const absTransform = back.getAbsoluteTransform().copy().invert();
 const local = absTransform.point(pointer);
 const w = back.width();
 const h = back.height();

 // Check if cursor is within EDGE_HIT_WIDTH of a border edge
 const distTop = Math.abs(local.y);
 const distBottom = Math.abs(local.y - h);
 const distLeft = Math.abs(local.x);
 const distRight = Math.abs(local.x - w);

 const threshold = EDGE_HIT_WIDTH;
 const inBoundsX = local.x >= -threshold && local.x <= w + threshold;
 const inBoundsY = local.y >= -threshold && local.y <= h + threshold;

 let nearestPill = "";

 if (inBoundsX && distTop < threshold && inBoundsY) nearestPill = "top-center";
 else if (inBoundsX && distBottom < threshold && inBoundsY) nearestPill = "bottom-center";
 else if (inBoundsY && distLeft < threshold && inBoundsX) nearestPill = "middle-left";
 else if (inBoundsY && distRight < threshold && inBoundsX) nearestPill = "middle-right";

 if (nearestPill) {
 wasOnEdge = true;

 if (nearestPill !== lastPill) {
 if (lastPill) setHovered(lastPill, false);
 setHovered(nearestPill, true);
 lastPill = nearestPill;
 uiLayer.batchDraw();
 }
 } else if (wasOnEdge) {
 clearEdgeState();
 }
 });

 function clearEdgeState() {
 if (lastPill) {
 setHovered(lastPill, false);
 lastPill = "";
 }
 wasOnEdge = false;
 // Don't reset cursor here — let Konva's anchor mouseout handle it
 // Only reset if no anchor is being hovered
 if (stage.content && !(transformer as any)._cursorChange) {
 stage.content.style.cursor = "";
 }
 uiLayer.batchDraw();
 }
}
