import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CarouselRow } from "./carousel-row.component";

afterEach(cleanup);

describe("CarouselRow", () => {
  beforeEach(() => {
    // happy-dom does not implement scrollBy; stub it so chevron clicks are safe.
    (Element.prototype as unknown as { scrollBy: () => void }).scrollBy = vi.fn();
  });

  it("renders chevrons with the provided labels and its children", () => {
    render(
      <CarouselRow ariaLabel="Row" leftLabel="Prev" rightLabel="Next">
        <span>tile</span>
      </CarouselRow>,
    );
    expect(screen.getByLabelText("Prev")).toBeDefined();
    expect(screen.getByLabelText("Next")).toBeDefined();
    expect(screen.getByText("tile")).toBeDefined();
  });

  it("scrolls the viewport when a chevron is clicked", () => {
    const scrollBy = vi.fn();
    (Element.prototype as unknown as { scrollBy: () => void }).scrollBy = scrollBy;

    render(
      <CarouselRow ariaLabel="Row" leftLabel="Prev" rightLabel="Next">
        <span>tile</span>
      </CarouselRow>,
    );

    fireEvent.click(screen.getByLabelText("Next"));
    expect(scrollBy).toHaveBeenCalled();
  });
});
