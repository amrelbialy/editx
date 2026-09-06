import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { TextPanel } from "./text-panel";

afterEach(cleanup);

/**
 * Back-compat guarantee (spec Scenario 18 / Goal 10): a consumer that only sets
 * the legacy `text.presets` array sees THOSE presets as a single category — not
 * the rich built-in catalog. Removing the default legacy seed from
 * `default-config` is what makes the built-ins the default when no legacy input
 * is supplied.
 */
describe("TextPanel legacy back-compat", () => {
  it("renders legacy text.presets as one category, not the built-ins", () => {
    render(
      React.createElement(
        ImageEditorProvider,
        {
          config: {
            text: { presets: [{ id: "my-title", label: "My Legacy Title" }] },
          },
        },
        React.createElement(TextPanel, { onAddText: vi.fn(), onAddTextPreset: vi.fn() }),
      ),
    );

    // The legacy preset is present…
    expect(screen.getByLabelText("My Legacy Title")).toBeDefined();
    // …and the built-in rich catalog categories are NOT rendered.
    expect(screen.queryByText("Plain Text")).toBeNull();
    expect(screen.queryByText("Curved Text")).toBeNull();
  });

  it("renders the built-in rich catalog when no legacy presets are supplied", () => {
    render(
      React.createElement(
        ImageEditorProvider,
        null,
        React.createElement(TextPanel, { onAddText: vi.fn(), onAddTextPreset: vi.fn() }),
      ),
    );

    expect(screen.getByText("Plain Text")).toBeDefined();
  });
});
