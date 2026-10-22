import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { DiscardConfirmationDialog } from "./discard-confirmation-dialog";

afterEach(cleanup);

describe("DiscardConfirmationDialog", () => {
  it("preserves the default close-editor warning", () => {
    render(<DiscardConfirmationDialog open onDiscard={vi.fn()} onCancel={vi.fn()} />, {
      wrapper: I18nProvider,
    });
    expect(screen.getByText(/close the editor/)).toBeDefined();
  });

  it("supports a project replacement warning without changing the actions", () => {
    const onDiscard = vi.fn();
    const onCancel = vi.fn();
    const description = "Opening this project will replace your current document.";
    render(
      <DiscardConfirmationDialog
        open
        description={description}
        onDiscard={onDiscard}
        onCancel={onCancel}
      />,
      { wrapper: I18nProvider },
    );
    expect(screen.getByText(description)).toBeDefined();
    expect(screen.queryByText(/close the editor/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }));
    expect(onCancel).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Discard", exact: true }));
    expect(onDiscard).toHaveBeenCalledOnce();
  });
});
