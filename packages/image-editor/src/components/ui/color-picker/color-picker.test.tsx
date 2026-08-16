import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ColorPicker } from "./color-picker.component";

afterEach(cleanup);

const renderColorPicker = (color: string, onChange = vi.fn()) => {
  const result = render(<ColorPicker color={color} onChange={onChange} swatches={[]} />);
  const nativeInput = result.container.querySelector<HTMLInputElement>('input[type="color"]');
  const hexInput = result.container.querySelector<HTMLInputElement>('input[type="text"]');

  if (!nativeInput || !hexInput) {
    throw new Error("ColorPicker inputs were not rendered");
  }

  return { ...result, hexInput, nativeInput, onChange };
};

describe("ColorPicker", () => {
  it.each([
    ["rgba(12, 34, 56, 0.25)", "#0c2238", "0C2238"],
    ["#A1B2C380", "#a1b2c3", "A1B2C3"],
  ])("normalizes %s at native and display boundaries", (color, nativeValue, displayValue) => {
    const { hexInput, nativeInput, onChange } = renderColorPicker(color);

    expect(nativeInput.value).toBe(nativeValue);
    expect(hexInput.value).toBe(displayValue);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits lowercase six-digit hex from native and text changes", () => {
    const { hexInput, nativeInput, onChange } = renderColorPicker("transparent");

    fireEvent.change(nativeInput, { target: { value: "#AABBCC" } });
    fireEvent.change(hexInput, { target: { value: "DDEEFF" } });

    expect(onChange).toHaveBeenNthCalledWith(1, "#aabbcc");
    expect(onChange).toHaveBeenNthCalledWith(2, "#ddeeff");
  });

  it("expands shorthand configured swatches on palette selection", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorPicker color="#000000" onChange={onChange} swatches={["#AbC"]} />,
    );
    const swatch = container.querySelector<HTMLButtonElement>("button");

    if (!swatch) {
      throw new Error("ColorPicker palette swatch was not rendered");
    }

    fireEvent.click(swatch);

    expect(onChange).toHaveBeenCalledWith("#aabbcc");
  });
});
