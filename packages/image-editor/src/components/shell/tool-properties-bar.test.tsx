import { cleanup, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { ToolPropertiesBar } from "./tool-properties-bar";

afterEach(cleanup);

const rotateFlipLabels = [
  "Rotate 90° left",
  "Rotate 90° right",
  "Flip horizontal",
  "Flip vertical",
];

const renderBar = (props: Partial<React.ComponentProps<typeof ToolPropertiesBar>>) =>
  render(
    <I18nProvider>
      <ToolPropertiesBar
        activeTool="crop"
        onRotateClockwise={vi.fn()}
        onRotateCounterClockwise={vi.fn()}
        onFlipHorizontal={vi.fn()}
        onFlipVertical={vi.fn()}
        onDone={vi.fn()}
        {...props}
      />
    </I18nProvider>,
  );

describe("ToolPropertiesBar rotate/flip gating", () => {
  it("shows the rotate/flip cluster for the crop tool by default", () => {
    renderBar({ activeTool: "crop" });
    for (const label of rotateFlipLabels) {
      expect(screen.getByRole("button", { name: label })).toBeDefined();
    }
  });

  it("hides the rotate/flip cluster for the crop tool when showRotateFlip is false", () => {
    renderBar({ activeTool: "crop", showRotateFlip: false });
    for (const label of rotateFlipLabels) {
      expect(screen.queryByRole("button", { name: label })).toBeNull();
    }
    // The Done action (always present) stays reachable.
    expect(screen.getByRole("button", { name: "Done" })).toBeDefined();
  });

  it("shows the rotate/flip cluster for the rotate tool when showRotateFlip is true", () => {
    renderBar({ activeTool: "rotate", showRotateFlip: true });
    expect(screen.getByRole("button", { name: "Rotate 90° left" })).toBeDefined();
  });

  it("never renders the cluster for non crop/rotate tools regardless of the flag", () => {
    renderBar({ activeTool: "text", showRotateFlip: true });
    expect(screen.queryByRole("button", { name: "Flip horizontal" })).toBeNull();
  });
});
