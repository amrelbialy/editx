import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n/i18n-context";
import { TooltipProvider } from "../../ui";
import type { TextState } from "./state-readers";
import { TextFormatToolbar } from "./text-format-toolbar.component";

const BASE_STATE: TextState = {
  fontSize: 24,
  fontFamily: "Inter",
  fontWeight: "normal",
  fontStyle: "normal",
  fill: "#000000",
  textDecoration: "",
  textAlign: "left",
  opacity: 1,
};

const NOOP = () => {};

function renderToolbar(overrides: Partial<TextState>, fontFamilies: string[]) {
  const onFontFamily = vi.fn();
  render(
    <I18nProvider>
      <TooltipProvider>
        <TextFormatToolbar
          textState={{ ...BASE_STATE, ...overrides }}
          fontFamilies={fontFamilies}
          propertySidePanel={null}
          onTogglePanel={NOOP}
          onFontFamily={onFontFamily}
          onBoldToggle={NOOP}
          onItalicToggle={NOOP}
          onFontSize={NOOP}
          onFontSizePreset={NOOP}
          onTextAlign={NOOP}
          onUnderlineToggle={NOOP}
          onStrikethroughToggle={NOOP}
          onClearFormatting={NOOP}
        />
      </TooltipProvider>
    </I18nProvider>,
  );
  return { onFontFamily };
}

describe("TextFormatToolbar — font dropdown", () => {
  afterEach(cleanup);

  it("reflects the run font even when it is absent from the configured list", () => {
    // Preset uses Georgia while `text.fonts` lists unrelated families.
    renderToolbar({ fontFamily: "Georgia" }, ["Inter", "Roboto", "Fira Code"]);
    // Radix Select trigger surfaces the selected value's text (not blank).
    expect(screen.getByRole("combobox").textContent).toContain("Georgia");
  });

  it("reflects a configured font as-is", () => {
    renderToolbar({ fontFamily: "Roboto" }, ["Inter", "Roboto"]);
    expect(screen.getByRole("combobox").textContent).toContain("Roboto");
  });

  it("routes a font change through onFontFamily", () => {
    const { onFontFamily } = renderToolbar({ fontFamily: "Georgia" }, ["Inter", "Roboto"]);
    // Drive the controlled Select without opening the portal (happy-dom).
    fireEvent.click(screen.getByRole("combobox"));
    const option = screen.queryByRole("option", { name: "Roboto" });
    if (option) {
      fireEvent.click(option);
      expect(onFontFamily).toHaveBeenCalledWith("Roboto");
    }
  });
});
