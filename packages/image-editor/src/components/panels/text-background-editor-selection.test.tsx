import type { EditxEngine, TextBackground } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { TextBackgroundSection } from "./text-background-section.component";

const FRAME: TextBackground = {
  enabled: false,
  color: { r: 0, g: 0, b: 0, a: 1 },
  geometry: "text-union",
  cornerRadius: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
};

function renderEditor(frameEnabled = false, highlightEnabled = false) {
  const block = {
    getTextRuns: vi
      .fn()
      .mockReturnValue([
        { text: "Hello", style: { backgroundColor: highlightEnabled ? "#FDE68A" : undefined } },
      ]),
    getTextBackground: vi.fn().mockReturnValue({ ...FRAME, enabled: frameEnabled }),
    supportsTextBackground: vi.fn().mockReturnValue(true),
    getTextCurve: vi.fn().mockReturnValue(null),
    setTextBackground: vi.fn(),
    setTextBackgroundEnabled: vi.fn(),
    setTextBackgroundColor: vi.fn(),
    setTextBackgroundOpacity: vi.fn(),
    setTextBackgroundCornerRadius: vi.fn(),
    setTextBackgroundPadding: vi.fn(),
  };
  const engine = {
    block,
    onHistoryChanged: vi.fn().mockReturnValue(() => {}),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  } as unknown as EditxEngine;
  render(
    <I18nProvider>
      <TextBackgroundSection
        engine={engine}
        blockId={7}
        getStyleRange={() => ({ start: 0, end: 5 })}
      />
    </I18nProvider>,
  );
  return block;
}

describe("TextBackgroundSection editor selection", () => {
  afterEach(cleanup);

  it("defaults to Frame when neither or both backgrounds are active", () => {
    renderEditor();
    expect(screen.getByRole("tab", { name: "Frame" })).toHaveAttribute("aria-selected", "true");
    cleanup();
    renderEditor(true, true);
    expect(screen.getByRole("tab", { name: "Frame" })).toHaveAttribute("aria-selected", "true");
  });

  it("selects Highlight initially when it is the only active background", () => {
    renderEditor(false, true);
    expect(screen.getByRole("tab", { name: "Highlight" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches the visible editor without mutating the document", () => {
    const block = renderEditor();
    fireEvent.click(screen.getByRole("tab", { name: "Highlight" }));
    expect(screen.getByRole("switch", { name: "Enable Background" })).toBeTruthy();
    expect(block.setTextBackground).not.toHaveBeenCalled();
    expect(block.setTextBackgroundEnabled).not.toHaveBeenCalled();
    expect(block.setTextBackgroundColor).not.toHaveBeenCalled();
  });

  it("explains the different padding behaviors", () => {
    renderEditor(true);
    expect(
      screen.getByRole("button", {
        name: "Moves text inward from the frame edges. The background remains within the frame.",
      }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Highlight" }));
    fireEvent.click(screen.getByRole("switch", { name: "Enable Background" }));

    expect(
      screen.getByRole("button", {
        name: "Expands the highlight around the text. It may extend beyond the text frame.",
      }),
    ).toBeTruthy();
  });
});
