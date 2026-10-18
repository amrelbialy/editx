// @vitest-environment happy-dom
import type { PageProperties, PagePropertiesUpdate } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PagePropertiesForm } from "./page-properties-form";

const page: PageProperties = {
  name: "Card",
  width: 400,
  height: 400,
  backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
  metadata: null,
};
const onApply = vi.fn<(update: PagePropertiesUpdate) => void>();

beforeEach(() => {
  onApply.mockReset();
  render(createElement(PagePropertiesForm, { page, disabled: false, onApply }));
});
afterEach(cleanup);

describe("page property inputs", () => {
  it.each([
    ["Page width", "width"],
    ["Page height", "height"],
    ["Background alpha", "alpha"],
  ] as const)("passes blank %s to SDK validation as NaN, not zero", (label, key) => {
    fireEvent.change(screen.getByRole("spinbutton", { name: label }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply page properties" }));

    expect(onApply).toHaveBeenCalledOnce();
    const update = onApply.mock.calls[0]?.[0];
    expect(key === "alpha" ? update?.backgroundColor?.a : update?.[key]).toBeNaN();
  });

  it.each([0, 0.45])("retains fractional dimensions and alpha %s", (alpha) => {
    for (const [label, value] of [
      ["Page width", "401.5"],
      ["Page height", "320.25"],
      ["Background alpha", String(alpha)],
    ]) {
      fireEvent.change(screen.getByRole("spinbutton", { name: label }), { target: { value } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Apply page properties" }));

    expect(onApply).toHaveBeenCalledExactlyOnceWith({
      name: "Card",
      width: 401.5,
      height: 320.25,
      backgroundColor: { r: 1, g: 1, b: 1, a: alpha },
      metadata: null,
    });
  });

  it("preserves absent metadata until the UI label is edited", () => {
    fireEvent.click(screen.getByRole("button", { name: "Apply page properties" }));
    expect(onApply.mock.calls[0]?.[0].metadata).toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: "Page UI label" }), {
      target: { value: "Preview" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply page properties" }));

    expect(onApply).toHaveBeenCalledTimes(2);
    expect(onApply.mock.lastCall?.[0].metadata).toEqual({ thumbnailAlt: "Preview" });
  });
});
