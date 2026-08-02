import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { useImageEditorStore } from "../../store/image-editor-store";
import { CropPanel } from "./crop-panel";

afterEach(cleanup);

describe("CropPanel", () => {
  beforeEach(() => {
    useImageEditorStore.setState({ cropPreset: "free" });
  });

  it("renders all 7 preset buttons", () => {
    const onPresetChange = vi.fn();
    render(React.createElement(CropPanel, { onPresetChange }));

    expect(screen.getByTestId("crop-preset-free")).toBeDefined();
    expect(screen.getByTestId("crop-preset-original")).toBeDefined();
    expect(screen.getByTestId("crop-preset-1:1")).toBeDefined();
    expect(screen.getByTestId("crop-preset-4:3")).toBeDefined();
    expect(screen.getByTestId("crop-preset-3:4")).toBeDefined();
    expect(screen.getByTestId("crop-preset-16:9")).toBeDefined();
    expect(screen.getByTestId("crop-preset-9:16")).toBeDefined();
  });

  it("highlights the active preset", () => {
    useImageEditorStore.setState({ cropPreset: "1:1" });
    const onPresetChange = vi.fn();
    render(React.createElement(CropPanel, { onPresetChange }));

    const activeBtn = screen.getByTestId("crop-preset-1:1");
    expect(activeBtn.className).toContain("bg-primary");
  });

  it("calls onPresetChange and setCropPreset when a preset is clicked", () => {
    const onPresetChange = vi.fn();
    render(React.createElement(CropPanel, { onPresetChange }));

    fireEvent.click(screen.getByTestId("crop-preset-4:3"));
    expect(onPresetChange).toHaveBeenCalledWith("4:3");
    expect(useImageEditorStore.getState().cropPreset).toBe("4:3");
  });

  it("does not call onPresetChange when clicking the already-active preset", () => {
    useImageEditorStore.setState({ cropPreset: "free" });
    const onPresetChange = vi.fn();
    render(React.createElement(CropPanel, { onPresetChange }));

    fireEvent.click(screen.getByTestId("crop-preset-free"));
    // Already active — shouldn't trigger change
    expect(onPresetChange).not.toHaveBeenCalled();
  });

  it("hides free presets and the ratio-lock toggle when custom ratios are disallowed", () => {
    useImageEditorStore.setState({ cropPreset: "free" });
    const onPresetChange = vi.fn();
    render(
      React.createElement(
        ImageEditorProvider,
        { config: { crop: { allowCustomRatio: false } } },
        React.createElement(CropPanel, { onPresetChange }),
      ),
    );

    // The free/unconstrained preset is filtered out…
    expect(screen.queryByTestId("crop-preset-free")).toBeNull();
    // …and the ratio-lock toggle is hidden (ratio is always fixed).
    expect(screen.queryByTestId("resize-ratio-lock")).toBeNull();
    // …and the active preset is forced off "free".
    expect(useImageEditorStore.getState().cropPreset).not.toBe("free");
    expect(onPresetChange).toHaveBeenCalled();
  });
});
