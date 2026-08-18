import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { I18nProvider } from "../../i18n/i18n-context";
import { CanvasPane } from "./canvas-pane";

vi.mock("../../hooks/use-block-screen-rect", () => ({
  useBlockScreenRect: () => ({ x: 0, y: 0, width: 200, height: 100 }),
}));
vi.mock("../../hooks/use-block-image-fill", () => ({ useBlockImageFill: () => false }));
vi.mock("./block-properties-bar", () => ({
  BlockPropertiesBar: () => <div data-testid="block-properties" />,
}));
vi.mock("./canvas-block-overlay", () => ({
  CanvasBlockOverlay: () => <div data-testid="block-overlay" />,
}));

afterEach(cleanup);

describe("CanvasPane graphic image-fill crop toolbar", () => {
  it("routes rotate and flip actions to image content", () => {
    const rotateLeft = vi.fn();
    const rotateRight = vi.fn();
    const flipHorizontal = vi.fn();
    const flipVertical = vi.fn();
    const legacyRotate = vi.fn();
    const legacyFlip = vi.fn();
    const engine = {
      on: vi.fn(),
      off: vi.fn(),
      block: { onBlockDoubleClick: vi.fn(() => () => {}) },
    };

    render(
      <I18nProvider>
        <ImageEditorProvider>
          <CanvasPane
            canvasRef={React.createRef<HTMLDivElement>()}
            engine={engine as never}
            activeTool="crop"
            selectedShapeId={7}
            selectedBlockType="graphic"
            hasSelectedBlock
            blockActions={{} as never}
            rotateFlip={{
              handleRotateClockwise: legacyRotate,
              handleRotateCounterClockwise: legacyRotate,
              handleFlipHorizontal: legacyFlip,
              handleFlipVertical: legacyFlip,
            }}
            imageFillCrop={{
              isActive: true,
              crop: {
                x: 0,
                y: 0,
                width: 200,
                height: 100,
                fit: "cover",
                alignment: "center",
                offsetX: 0,
                offsetY: 0,
                scale: 1,
                rotation: 0,
                flipHorizontal: false,
                flipVertical: false,
              },
              update: vi.fn(),
              rotateLeft,
              rotateRight,
              flipHorizontal,
              flipVertical,
            }}
            replaceImage={vi.fn()}
            onContextualReset={vi.fn()}
            onDone={vi.fn()}
            onCropCancel={vi.fn()}
          />
        </ImageEditorProvider>
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rotate 90° left" }));
    fireEvent.click(screen.getByRole("button", { name: "Rotate 90° right" }));
    fireEvent.click(screen.getByRole("button", { name: "Flip horizontal" }));
    fireEvent.click(screen.getByRole("button", { name: "Flip vertical" }));

    expect(rotateLeft).toHaveBeenCalledOnce();
    expect(rotateRight).toHaveBeenCalledOnce();
    expect(flipHorizontal).toHaveBeenCalledOnce();
    expect(flipVertical).toHaveBeenCalledOnce();
    expect(legacyRotate).not.toHaveBeenCalled();
    expect(legacyFlip).not.toHaveBeenCalled();
    expect(screen.queryByTestId("block-properties")).not.toBeInTheDocument();
    expect(screen.queryByTestId("block-overlay")).not.toBeInTheDocument();
  });
});
