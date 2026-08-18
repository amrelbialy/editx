import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { ImageFillCropToolbar } from "./image-fill-crop-toolbar";

const CROP = {
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  fit: "cover" as const,
  alignment: "center" as const,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

afterEach(cleanup);

describe("ImageFillCropToolbar", () => {
  it("offers all image fill modes and updates the selected fit", () => {
    const onChange = vi.fn();
    render(
      <I18nProvider>
        <ImageFillCropToolbar crop={CROP} onChange={onChange} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getAllByRole("combobox")[0]);

    expect(screen.getByRole("option", { name: "Cover" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Contain" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Tile" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Stretch" })).toBeDefined();
    fireEvent.click(screen.getByRole("option", { name: "Stretch" }));
    expect(onChange).toHaveBeenCalledWith({ fit: "stretch" });
  });

  it("offers nine alignments and resets residual pan when one is selected", () => {
    const onChange = vi.fn();
    render(
      <I18nProvider>
        <ImageFillCropToolbar crop={CROP} onChange={onChange} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Alignment" }));

    expect(screen.getAllByRole("option")).toHaveLength(9);
    fireEvent.click(screen.getByRole("option", { name: "Bottom right" }));
    expect(onChange).toHaveBeenCalledWith({
      alignment: "bottom-right",
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("clamps scale updates to 0.1 through 4", () => {
    const onChange = vi.fn();
    render(
      <I18nProvider>
        <ImageFillCropToolbar crop={CROP} onChange={onChange} />
      </I18nProvider>,
    );
    const scale = screen.getByRole("spinbutton", { name: "Scale" });

    fireEvent.change(scale, { target: { value: "9" } });
    fireEvent.change(scale, { target: { value: "0" } });

    expect(onChange).toHaveBeenNthCalledWith(1, { scale: 4 });
    expect(onChange).toHaveBeenNthCalledWith(2, { scale: 0.1 });
  });
});
