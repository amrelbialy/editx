import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { PagePropertiesBar } from "./page-properties-bar";

afterEach(cleanup);

describe("page properties bar", () => {
  it("stages background color locally, applies explicitly, and resets discarded drafts", () => {
    const onBackground = vi.fn(() => true);
    const onResize = vi.fn();
    const view = render(
      <I18nProvider>
        <PagePropertiesBar
          backgroundColor={{ r: 1, g: 1, b: 1, a: 0.4 }}
          disabled={false}
          onResize={onResize}
          onBackground={onBackground}
        />
      </I18nProvider>,
    );
    fireEvent.click(view.getByRole("button", { name: "Resize" }));
    expect(onResize).toHaveBeenCalledOnce();
    const trigger = view.getByRole("button", { name: "Background color" });
    fireEvent.click(trigger);
    const input = view.getByLabelText("Page background color");
    expect(input).toHaveValue("#ffffff");
    fireEvent.change(input, { target: { value: "#ff0000" } });
    expect(onBackground).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole("button", { name: "Apply color" }));
    expect(onBackground).toHaveBeenCalledExactlyOnceWith("#ff0000");
    expect(view.queryByRole("button", { name: "Apply color" })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(view.getByLabelText("Page background color")).toHaveValue("#ffffff");
    fireEvent.change(view.getByLabelText("Page background color"), {
      target: { value: "#00ff00" },
    });
    fireEvent.click(trigger);
    expect(onBackground).toHaveBeenCalledOnce();
    fireEvent.click(trigger);
    expect(view.getByLabelText("Page background color")).toHaveValue("#ffffff");
  });

  it("keeps a failed color apply open and disables property actions while editing", () => {
    const onBackground = vi.fn(() => false);
    const content = (disabled: boolean) => (
      <I18nProvider>
        <PagePropertiesBar
          backgroundColor={{ r: 0, g: 0, b: 1, a: 1 }}
          disabled={disabled}
          onResize={vi.fn()}
          onBackground={onBackground}
        />
      </I18nProvider>
    );
    const view = render(content(false));
    fireEvent.click(view.getByRole("button", { name: "Background color" }));
    fireEvent.click(view.getByRole("button", { name: "Apply color" }));
    expect(onBackground).toHaveBeenCalledExactlyOnceWith("#0000ff");
    expect(view.getByRole("button", { name: "Apply color" })).toBeInTheDocument();
    view.rerender(content(true));
    expect(view.queryByRole("button", { name: "Apply color" })).not.toBeInTheDocument();
    expect(view.getByRole("button", { name: "Background color" })).toBeDisabled();
    expect(view.getByRole("button", { name: "Resize" })).toBeDisabled();
  });
});
