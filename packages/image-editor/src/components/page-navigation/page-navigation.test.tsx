import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNavigationEngine,
  resetPageNavigationStore,
} from "../../__tests__/page-navigation-fixture";
import { I18nProvider } from "../../i18n/i18n-context";
import { useImageEditorStore } from "../../store/image-editor-store";
import { PageNavigation } from "./page-navigation";

beforeEach(resetPageNavigationStore);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("on-canvas page navigation", () => {
  it("renders numbered titles without exporting thumbnails or fitting on pointer selection", async () => {
    const { engine, poster, exportThumbnail } = await createNavigationEngine();
    const fit = vi.spyOn(engine.editor, "fitToScreen");
    const view = render(
      <I18nProvider>
        <PageNavigation engine={engine} />
      </I18nProvider>,
    );
    expect(view.getByRole("navigation", { name: "Pages" })).toBeInTheDocument();
    expect(view.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Page 1",
      "Page 2",
      "Page 3",
    ]);
    expect(view.container.querySelectorAll("img")).toHaveLength(0);
    expect(exportThumbnail).not.toHaveBeenCalled();
    const cover = view.getByRole("button", { name: "Select page 1: Cover" });
    expect(cover).toHaveAttribute("aria-current", "page");
    expect(cover).toHaveAttribute("aria-pressed", "false");
    fit.mockClear();

    fireEvent.click(view.getByRole("button", { name: "Select page 2: Poster" }));

    expect(engine.scene.getCurrentPage()).toBe(poster);
    expect(engine.block.findAllSelected()).toEqual([poster]);
    expect(view.getByRole("button", { name: "Select page 2: Poster" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(cover).not.toHaveAttribute("aria-current");
    expect(fit).not.toHaveBeenCalled();
    expect(engine.canUndo()).toBe(false);
  });

  it("uses consumer translations and keeps unnamed pages numbered", async () => {
    const { engine, cover } = await createNavigationEngine();
    engine.scene.setPageProperties(cover, { name: "" });
    const view = render(
      <I18nProvider
        translations={{
          "pages.navigation": "Document pages",
          "pages.selectPage": "Choose sheet",
          "pages.page": "Sheet",
        }}
      >
        <PageNavigation engine={engine} />
      </I18nProvider>,
    );
    expect(view.getByRole("navigation", { name: "Document pages" })).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Choose sheet 1" })).toHaveTextContent("Sheet 1");
  });

  it("highlights the page frame when its title is hovered without capturing canvas input", async () => {
    const { engine } = await createNavigationEngine();
    const view = render(
      <I18nProvider>
        <PageNavigation engine={engine} />
      </I18nProvider>,
    );
    const title = view.getByRole("button", { name: "Select page 1: Cover" });
    fireEvent.pointerEnter(title);
    expect(view.getByTestId("page-title-hover-outline")).toHaveStyle({
      left: "100px",
      top: "120px",
      width: "800px",
      height: "600px",
    });
    expect(view.getByRole("navigation")).toHaveClass("pointer-events-none");
    fireEvent.pointerLeave(title);
    expect(view.queryByTestId("page-title-hover-outline")).not.toBeInTheDocument();
  });

  it("renumbers titles after page reordering and omits authored-hidden pages", async () => {
    const { engine, card, poster } = await createNavigationEngine();
    const view = render(
      <I18nProvider>
        <PageNavigation engine={engine} />
      </I18nProvider>,
    );
    act(() => {
      engine.scene.movePage(card, 0);
      engine.block.setVisible(poster, false);
    });
    expect(view.getByRole("button", { name: "Select page 1: Card" })).toHaveTextContent("Page 1");
    expect(view.getByRole("button", { name: "Select page 2: Cover" })).toBeInTheDocument();
    expect(view.getAllByRole("button")).toHaveLength(2);
  });

  it("disables title selection while inline editing is active", async () => {
    const { engine } = await createNavigationEngine();
    const view = render(
      <I18nProvider>
        <PageNavigation engine={engine} />
      </I18nProvider>,
    );
    act(() => useImageEditorStore.getState().setEditingTextBlockId(42));
    for (const button of view.getAllByRole("button")) expect(button).toBeDisabled();
  });
});
