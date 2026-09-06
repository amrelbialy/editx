import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { useImageEditorStore } from "../../store/image-editor-store";
import { SidePanel } from "./side-panel";

vi.mock("../panels/crop-panel", () => ({
  CropPanel: () => <div data-testid="existing-crop-panel" />,
}));

afterEach(cleanup);

describe("SidePanel graphic image-fill crop", () => {
  it("renders the existing CropPanel for the crop tool", () => {
    useImageEditorStore.setState({ propertySidePanel: null });
    render(
      <I18nProvider>
        <SidePanel
          engine={null}
          selectedShapeId={null}
          selectedBlockType={null}
          activeTool="crop"
          crop={{
            handleCropPresetChange: vi.fn(),
            handleResizeDimensions: vi.fn(),
            handleCropCancel: vi.fn(),
            cropDimensions: { width: 200, height: 100 },
          }}
          rotateFlip={{
            rotationState: { rotation: 0, flipH: false, flipV: false },
            handleRotateClockwise: vi.fn(),
            handleRotateCounterClockwise: vi.fn(),
            handleFlipHorizontal: vi.fn(),
            handleFlipVertical: vi.fn(),
            handleRotateReset: vi.fn(),
          }}
          adjustments={{
            adjustValues: {} as never,
            handleAdjustChange: vi.fn(),
            handleAdjustCommit: vi.fn(),
            handleAdjustReset: vi.fn(),
          }}
          filter={{ activeFilter: "none", handleFilterSelect: vi.fn() }}
          addShape={vi.fn()}
          addText={vi.fn()}
          addTextPreset={vi.fn()}
          addShapePreset={vi.fn()}
          addImage={vi.fn()}
          replaceImage={vi.fn()}
          blockEffects={{
            adjustValues: {} as never,
            handleAdjustChange: vi.fn(),
            handleAdjustCommit: vi.fn(),
            handleAdjustReset: vi.fn(),
            activeFilter: "none",
            handleFilterSelect: vi.fn(),
          }}
          blockActions={{} as never}
        />
      </I18nProvider>,
    );

    expect(screen.getByTestId("existing-crop-panel")).toBeDefined();
  });
});
