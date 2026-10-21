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
    expect(
      view.getAllByRole("button", { name: /^Select page/ }).map((button) => button.textContent),
    ).toEqual(["Page 1: Cover", "Page 2: Poster", "Page 3: Card"]);
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
    expect(view.getAllByRole("button", { name: /^Select page/ })).toHaveLength(2);
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

  it("reveals actions only for the selected page, not the active page or selected artwork", async () => {
    const { engine, poster } = await createNavigationEngine();
    const text = engine.block.addText(poster, 10, 20, 100, 40, "Artwork");
    const view = render(
      <I18nProvider>
        <PageNavigation engine={engine} />
      </I18nProvider>,
    );
    expect(view.queryByRole("button", { name: /^Page actions:/ })).not.toBeInTheDocument();
    expect(view.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(view.getByRole("button", { name: "Add page" })).toBeEnabled();
    fireEvent.click(view.getByRole("button", { name: "Select page 1: Cover" }));
    expect(view.getByRole("button", { name: "Page actions: Page 1: Cover" })).toBeInTheDocument();
    expect(view.getByRole("toolbar", { name: "Page properties" })).toBeInTheDocument();
    expect(view.getByRole("toolbar", { name: "Page actions" })).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Add page" })).toHaveClass("left-1/2", "top-full");
    fireEvent.click(view.getByRole("button", { name: "Select page 2: Poster" }));
    expect(view.getAllByRole("button", { name: /^Page actions:/ })).toHaveLength(1);
    expect(view.getByRole("button", { name: "Page actions: Page 2: Poster" })).toBeInTheDocument();
    act(() => engine.block.select(text));
    expect(engine.scene.getCurrentPage()).toBe(poster);
    expect(view.queryByRole("button", { name: /^Page actions:/ })).not.toBeInTheDocument();
    expect(view.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(view.getByRole("button", { name: "Add page" })).toBeEnabled();
  });

  it("opens properties on a title double-click without creating history", async () => {
    const { engine, poster } = await createNavigationEngine();
    const view = render(
      <I18nProvider>
        <PageNavigation engine={engine} />
      </I18nProvider>,
    );
    const title = view.getByRole("button", { name: "Select page 2: Poster" });
    fireEvent.click(title);
    expect(view.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.doubleClick(title);
    expect(view.getByRole("dialog", { name: "Rename and resize page" })).toBeInTheDocument();
    expect(view.getByRole("textbox", { name: "Name" })).toHaveValue("Poster");
    expect(engine.scene.getCurrentPage()).toBe(poster);
    expect(engine.canUndo()).toBe(false);
    fireEvent.click(view.getByRole("button", { name: "Cancel" }));
    expect(view.queryByRole("dialog")).not.toBeInTheDocument();
    act(() => useImageEditorStore.getState().setEditingTextBlockId(42));
    expect(view.getByRole("button", { name: "Add page" })).toBeDisabled();
    expect(
      view.queryByRole("button", { name: "Page actions: Page 2: Poster" }),
    ).not.toBeInTheDocument();
    fireEvent.doubleClick(title);
    expect(view.queryByRole("dialog")).not.toBeInTheDocument();
    expect(engine.canUndo()).toBe(false);
  });

  it("opens the properties dialog from the selected page's Resize button", async () => {
    const { engine } = await createNavigationEngine();
    const view = render(
      <I18nProvider>
        <PageNavigation engine={engine} />
      </I18nProvider>,
    );
    fireEvent.click(view.getByRole("button", { name: "Select page 1: Cover" }));
    fireEvent.click(view.getByRole("button", { name: "Resize" }));
    expect(view.getByRole("dialog", { name: "Rename and resize page" })).toBeInTheDocument();
    expect(engine.canUndo()).toBe(false);
  });
});
