/**
 * Hit-detection width (px) around a transformer border edge.
 *
 * A `Konva.Transformer` counter-scales itself by 1/layerScale on every update
 * (via each node's `absoluteTransformChange`), so its local coordinate space is
 * already 1:1 with screen pixels. Handle/anchor/border sizes are therefore
 * specified in raw screen px — no manual zoom compensation is needed or wanted.
 */
export const EDGE_HIT_WIDTH = 12;
