import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { ToolPanel } from "./tool-panel";

afterEach(cleanup);

const ToolPanelHarness: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <I18nProvider>
      <button type="button" onClick={() => setOpen(true)}>
        Open text
      </button>
      <ToolPanel open={open} title="Text" onClose={() => setOpen(false)}>
        <button type="button">Add title</button>
      </ToolPanel>
    </I18nProvider>
  );
};

describe("ToolPanel", () => {
  it("focuses the dialog on open and restores focus on close", async () => {
    render(<ToolPanelHarness />);
    const trigger = screen.getByRole("button", { name: "Open text" });

    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Text" });
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Close panel" }));

    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(document.activeElement).toBe(trigger);
  });
});
