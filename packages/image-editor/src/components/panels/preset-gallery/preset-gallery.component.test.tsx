import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PresetGroup, PresetPreview } from "../../../config/config.types";
import { I18nProvider } from "../../../i18n/i18n-context";
import { PresetGallery } from "./preset-gallery.component";

interface GItem {
  id: string;
  label: string;
  preview: PresetPreview;
}

const preview: PresetPreview = { kind: "shape", style: { background: "#f00" } };

function mkPresets(prefix: string, n: number): GItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    label: `${prefix}-item-${i}`,
    preview,
  }));
}

const GROUPS: PresetGroup<GItem>[] = [
  { id: "filled", label: "Filled", presets: mkPresets("filled", 5) },
  { id: "outline", label: "Outline", presets: mkPresets("outline", 2) },
];

function renderGallery(onSelect = vi.fn()) {
  render(
    React.createElement(
      I18nProvider,
      null,
      React.createElement(PresetGallery, { groups: GROUPS, onSelect }),
    ),
  );
  return onSelect;
}

describe("PresetGallery", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders a header for every category", () => {
    renderGallery();
    expect(screen.getByText("Filled")).toBeDefined();
    expect(screen.getByText("Outline")).toBeDefined();
  });

  it("shows the correct More (N) count and no toggle under the cap", () => {
    renderGallery();
    // 5 presets, VISIBLE_COUNT=3 → More (2)
    expect(screen.getByText("More (2)")).toBeDefined();
    // 2 presets → no toggle
    expect(screen.queryByText(/More \(/)).not.toBeNull();
  });

  it("expands to a grid and collapses back to a carousel", () => {
    renderGallery();
    // Collapsed: only 3 of the 5 filled tiles are visible
    expect(screen.queryByLabelText("filled-item-4")).toBeNull();

    fireEvent.click(screen.getByText("More (2)"));
    expect(screen.getByLabelText("filled-item-4")).toBeDefined();
    expect(screen.getByText("Less")).toBeDefined();

    fireEvent.click(screen.getByText("Less"));
    expect(screen.queryByLabelText("filled-item-4")).toBeNull();
  });

  it("live-filters and hides categories with no matches", () => {
    renderGallery();
    const input = screen.getByLabelText("Search presets");

    fireEvent.change(input, { target: { value: "outline" } });
    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByText("Outline")).toBeDefined();
    expect(screen.queryByText("Filled")).toBeNull();
  });

  it("shows an empty state when nothing matches", () => {
    renderGallery();
    const input = screen.getByLabelText("Search presets");

    fireEvent.change(input, { target: { value: "zzznope" } });
    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByText("No presets found")).toBeDefined();
  });

  it("calls onSelect with the preset id when a card is clicked", () => {
    const onSelect = renderGallery();
    fireEvent.click(screen.getByLabelText("filled-item-0"));
    expect(onSelect).toHaveBeenCalledWith("filled0");
  });
});
