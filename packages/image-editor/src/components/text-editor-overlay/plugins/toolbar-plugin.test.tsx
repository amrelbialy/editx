import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from "@lexical/react/LexicalComposerContext";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalEditor,
} from "lexical";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../../../i18n/i18n-context";
import { useImageEditorStore } from "../../../store/image-editor-store";
import { ToolbarPlugin } from "./toolbar-plugin";

function renderWithEditor(editor: LexicalEditor, node: React.ReactNode) {
  const ctx: [LexicalEditor, ReturnType<typeof createLexicalComposerContext>] = [
    editor,
    createLexicalComposerContext(null, { paragraph: "lexical-paragraph" }),
  ];
  return render(
    <I18nProvider>
      <LexicalComposerContext.Provider value={ctx}>{node}</LexicalComposerContext.Provider>
    </I18nProvider>,
  );
}

describe("ToolbarPlugin", () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    useImageEditorStore.setState({ propertySidePanel: null });
    editor = createEditor({
      namespace: "toolbar-test",
      onError: (e) => {
        throw e;
      },
    });
  });

  afterEach(cleanup);

  it("renders the inline toolbar carrying data-text-toolbar", () => {
    const { container } = renderWithEditor(editor, <ToolbarPlugin zoom={1} />);
    // This marker keeps the blur handler from closing the editor on toolbar clicks.
    expect(container.querySelector("[data-text-toolbar]")).not.toBeNull();
  });

  it("exposes accessible labels on the primitive icon buttons", () => {
    renderWithEditor(editor, <ToolbarPlugin zoom={1} />);
    // aria-label must forward through the IconButton primitive after the split.
    for (const name of ["Bold", "Italic", "Underline", "Strikethrough", "Color"]) {
      expect(screen.getByRole("button", { name }).getAttribute("aria-label")).toBe(name);
    }
  });

  it("toggles the color side panel from the swatch button", () => {
    renderWithEditor(editor, <ToolbarPlugin zoom={1} />);
    const color = screen.getByRole("button", { name: "Color" });

    fireEvent.click(color);
    expect(useImageEditorStore.getState().propertySidePanel).toBe("color");

    fireEvent.click(screen.getByRole("button", { name: "Color" }));
    expect(useImageEditorStore.getState().propertySidePanel).toBeNull();
  });

  it("renders the gradient (not the solid fill) in the swatch when the run has a gradient", async () => {
    renderWithEditor(editor, <ToolbarPlugin zoom={1} />);

    const gradient = {
      type: "linear",
      angle: 90,
      stops: [
        { offset: 0, color: "#ff0000" },
        { offset: 1, color: "#0000ff" },
      ],
    };
    const encoded = encodeURIComponent(JSON.stringify(gradient));

    act(() => {
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const textNode = $createTextNode("Colorful");
          textNode.setStyle(`color: #ff0000; --text-fill-gradient: ${encoded}`);
          paragraph.append(textNode);
          $getRoot().clear().append(paragraph);
          textNode.select(0, "Colorful".length);
        },
        { discrete: true },
      );
    });

    await waitFor(() => {
      const swatch = screen.getByRole("button", { name: "Color" }).querySelector("div");
      expect(swatch?.style.background).toContain("linear-gradient");
    });
  });
});
