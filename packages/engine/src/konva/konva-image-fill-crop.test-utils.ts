import Konva from "konva";
import { vi } from "vitest";
import type { ImageFillCrop } from "../editor-types";
import type { KonvaCropOverlay } from "./konva-crop-overlay";
import { KonvaImageFillCrop } from "./konva-image-fill-crop";
import type { ImageFillCropPreview } from "./konva-image-fill-crop-preview";

type CropFrame = Pick<ImageFillCrop, "x" | "y" | "width" | "height">;
type TestMock = ReturnType<typeof vi.fn>;

interface ImageFillCropTestSetup {
  crop: KonvaImageFillCrop;
  node: Konva.Rect;
  onChange: TestMock;
  onDismiss: TestMock;
  applyFrame: TestMock;
  style: { cursor: string };
  cropOverlay: KonvaCropOverlay;
  setPointer: (next: { x: number; y: number }) => void;
  move: () => void;
  end: () => void;
  click: (target: Konva.Node) => void;
  preview: () => Konva.Shape;
}

export const INITIAL_IMAGE_FILL_CROP: ImageFillCrop = {
  x: 12,
  y: 24,
  width: 200,
  height: 100,
  fit: "cover",
  alignment: "center",
  offsetX: 0,
  offsetY: 20,
  scale: 1,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

export function imagePlanePolygon(aperture: Konva.Shape): { x: number; y: number }[] {
  const plane = aperture.getParent()?.findOne(".image-fill-crop-plane") as Konva.Image;
  const absolute = plane.getAbsoluteTransform();
  return [
    absolute.point({ x: 0, y: 0 }),
    absolute.point({ x: plane.width(), y: 0 }),
    absolute.point({ x: plane.width(), y: plane.height() }),
    absolute.point({ x: 0, y: plane.height() }),
  ];
}

export function setupImageFillCrop(withSource = true): ImageFillCropTestSetup {
  let pointer = { x: 100, y: 100 };
  let move: (() => void) | null = null;
  let end: (() => void) | null = null;
  let click: ((event: { target: Konva.Node; cancelBubble: boolean }) => void) | null = null;
  const style = { cursor: "" };
  const stage = {
    container: () => ({ style }),
    getPointerPosition: () => pointer,
    on: vi.fn((events: string, callback: () => void) => {
      if (events.includes("mousemove")) move = callback;
      if (events.includes("mouseup")) end = callback;
      if (events.includes("click.imageFillCrop")) click = callback;
    }),
    off: vi.fn(),
  } as unknown as Konva.Stage;
  const cropOverlay = {
    setRatio: vi.fn(),
    setBlockFrame: vi.fn(),
    containsBlockPoint: vi.fn(() => true),
    showBlock: vi.fn(),
    refreshBlock: vi.fn(),
    hide: vi.fn(),
  } as unknown as KonvaCropOverlay;
  const parent = new Konva.Group({ x: 40, y: 30, rotation: 25, scaleX: 1.2, scaleY: 0.8 });
  const node = new Konva.Rect({ width: 200, height: 100, draggable: true });
  parent.add(node);
  if (withSource) node.setAttr("__fillPatternSource", { width: 400, height: 400 });
  const onChange = vi.fn();
  const onDismiss = vi.fn();
  const applyFrame = vi.fn((_blockId: number, frame: CropFrame, target: ImageFillCropPreview) => {
    target.node.setAttrs({ x: frame.x, y: frame.y, width: frame.width, height: frame.height });
  });
  const crop = new KonvaImageFillCrop(
    stage,
    new Map([[7, node]]),
    cropOverlay,
    onChange,
    applyFrame,
    onDismiss,
  );

  return {
    crop,
    node,
    onChange,
    onDismiss,
    applyFrame,
    style,
    cropOverlay,
    setPointer: (next: { x: number; y: number }) => {
      pointer = next;
    },
    move: () => move?.(),
    end: () => end?.(),
    click: (target: Konva.Node) => click?.({ target, cancelBubble: false }),
    preview: () => {
      const calls = vi.mocked(cropOverlay.showBlock).mock.calls;
      return calls[calls.length - 1]?.[0] as Konva.Shape;
    },
  };
}
