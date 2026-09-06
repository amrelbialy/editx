import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PresetCard } from "./preset-card.component";

afterEach(cleanup);

describe("PresetCard", () => {
  it("exposes the accessible name and renders children", () => {
    render(
      <PresetCard ariaLabel="Big Title" onClick={vi.fn()}>
        <span>thumb</span>
      </PresetCard>,
    );
    expect(screen.getByLabelText("Big Title")).toBeDefined();
    expect(screen.getByText("thumb")).toBeDefined();
  });

  it("calls onClick when pressed", () => {
    const onClick = vi.fn();
    render(
      <PresetCard ariaLabel="Card" onClick={onClick}>
        <span>x</span>
      </PresetCard>,
    );
    fireEvent.click(screen.getByLabelText("Card"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("reflects the active state via aria-pressed", () => {
    render(
      <PresetCard ariaLabel="Card" active onClick={vi.fn()}>
        <span>x</span>
      </PresetCard>,
    );
    expect(screen.getByLabelText("Card").getAttribute("aria-pressed")).toBe("true");
  });
});
