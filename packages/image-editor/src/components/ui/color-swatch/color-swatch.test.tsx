import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ColorSwatch } from "./color-swatch.component";

afterEach(cleanup);

describe("ColorSwatch", () => {
  it("renders transparent as an opaque native color without changing stored color", () => {
    const onChange = vi.fn();
    render(<ColorSwatch aria-label="Fill color" value="transparent" onChange={onChange} />);

    expect(screen.getByLabelText<HTMLInputElement>("Fill color").value).toBe("#000000");
    expect(onChange).not.toHaveBeenCalled();
  });
});
