import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { ImageFillCropToolbar } from "./image-fill-crop-toolbar";

const CROP = {
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  mode: "crop" as const,
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
  it("offers exactly Crop, Cover, Fit, and Tile", () => {
    const onChange = vi.fn();
    render(
      <I18nProvider>
        <ImageFillCropToolbar crop={CROP} onChange={onChange} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getAllByRole("combobox")[0]);

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Crop",
      "Cover",
      "Fit",
      "Tile",
    ]);
    fireEvent.click(screen.getByRole("option", { name: "Fit" }));
    expect(onChange).toHaveBeenCalledWith({ mode: "fit" });
  });

  it.each(["cover", "fit"] as const)("offers nine alignments for %s", (mode) => {
    const onChange = vi.fn();
    render(
      <I18nProvider>
        <ImageFillCropToolbar crop={{ ...CROP, mode }} onChange={onChange} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Alignment" }));

    expect(screen.getAllByRole("option")).toHaveLength(9);
    fireEvent.click(screen.getByRole("option", { name: "Bottom right" }));
    expect(onChange).toHaveBeenCalledWith({ alignment: "bottom-right" });
  });

  it.each(["crop", "tile"] as const)("hides alignment for %s", (mode) => {
    render(
      <I18nProvider>
        <ImageFillCropToolbar crop={{ ...CROP, mode }} onChange={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.queryByRole("combobox", { name: "Alignment" })).toBeNull();
  });

  it.each([
    ["crop", 1],
    ["tile", 0.1],
  ] as const)("clamps %s scale between %s and 4", (mode, minimum) => {
    const onChange = vi.fn();
    render(
      <I18nProvider>
        <ImageFillCropToolbar
          crop={{ ...CROP, mode, scale: mode === "tile" ? 0.1 : 1 }}
          onChange={onChange}
        />
      </I18nProvider>,
    );
    const scale = screen.getByRole("spinbutton", { name: "Scale" });
    if (mode === "tile") expect(scale).toHaveValue(0.1);

    fireEvent.change(scale, { target: { value: "0" } });
    fireEvent.change(scale, { target: { value: "9" } });

    expect(onChange).toHaveBeenNthCalledWith(1, { scale: minimum });
    expect(onChange).toHaveBeenNthCalledWith(2, { scale: 4 });
  });
});
