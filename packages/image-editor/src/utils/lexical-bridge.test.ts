import type { TextRun } from "@editx/engine";
import { createEditor, ParagraphNode, TextNode } from "lexical";
import { beforeEach, describe, expect, it } from "vitest";
import { editorStateToRuns, runsToEditorState } from "./lexical-bridge";

function createTestEditor() {
  const editor = createEditor({
    namespace: "test",
    nodes: [ParagraphNode, TextNode],
    onError: (error) => {
      throw error;
    },
  });

  // Lexical requires a root element to be attached
  const root = document.createElement("div");
  root.contentEditable = "true";
  document.body.appendChild(root);
  editor.setRootElement(root);

  return { editor, root };
}

function run(text: string, style: TextRun["style"] = {}): TextRun {
  return { text, style };
}

describe("lexical-bridge", () => {
  let editor: ReturnType<typeof createTestEditor>["editor"];
  let _root: HTMLDivElement;

  beforeEach(() => {
    const result = createTestEditor();
    editor = result.editor;
    _root = result.root;
  });

  // ── Round-trip: TextRun[] → Lexical → TextRun[] ──────────────────

  describe("round-trip", () => {
    it("preserves plain text", async () => {
      const runs = [run("Hello World")];
      await applyRuns(runs);

      const state = editor.getEditorState();
      const result = editorStateToRuns(state);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Hello World");
    });

    it("preserves bold style", async () => {
      const runs = [run("Bold", { fontWeight: "bold" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Bold");
      expect(result[0].style.fontWeight).toBe("bold");
    });

    it("treats fontWeight 700 as bold", async () => {
      const runs = [run("SemiBold", { fontWeight: "700" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("SemiBold");
      expect(result[0].style.fontWeight).toBe("bold");
    });

    it("preserves italic style", async () => {
      const runs = [run("Italic", { fontStyle: "italic" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.fontStyle).toBe("italic");
    });

    it("preserves fontSize via CSS string", async () => {
      const runs = [run("Big", { fontSize: 48 })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.fontSize).toBe(48);
    });

    it("preserves fontFamily via CSS string", async () => {
      const runs = [run("Serif", { fontFamily: "Georgia" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.fontFamily).toBe("Georgia");
    });

    it("preserves fill color via CSS string", async () => {
      const runs = [run("Red", { fill: "#ff0000" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.fill).toBe("#ff0000");
    });

    it("preserves letterSpacing via CSS string", async () => {
      const runs = [run("Spaced", { letterSpacing: 2.5 })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.letterSpacing).toBe(2.5);
    });

    it("preserves underline textDecoration", async () => {
      const runs = [run("Underlined", { textDecoration: "underline" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.textDecoration).toBe("underline");
    });

    it("preserves line-through textDecoration", async () => {
      const runs = [run("Struck", { textDecoration: "line-through" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.textDecoration).toBe("line-through");
    });
  });

  // ── Multi-run / mixed styles ──────────────────────────────────────

  describe("mixed styles", () => {
    it("preserves adjacent runs with different styles", async () => {
      const runs = [run("Hello ", { fontWeight: "bold" }), run("World", { fontStyle: "italic" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe("Hello ");
      expect(result[0].style.fontWeight).toBe("bold");
      expect(result[1].text).toBe("World");
      expect(result[1].style.fontStyle).toBe("italic");
    });

    it("merges adjacent runs with identical styles", async () => {
      const runs = [run("Hello ", { fill: "#000" }), run("World", { fill: "#000" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      // Should merge since styles match
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Hello World");
    });

    it("preserves bold + italic combined", async () => {
      const runs = [run("BoldItalic", { fontWeight: "bold", fontStyle: "italic" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result[0].style.fontWeight).toBe("bold");
      expect(result[0].style.fontStyle).toBe("italic");
    });
  });

  // ── Multi-paragraph / newlines ────────────────────────────────────

  describe("newlines", () => {
    it("preserves newlines as paragraph boundaries", async () => {
      const runs = [run("Line 1\nLine 2")];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      const fullText = result.map((r) => r.text).join("");
      expect(fullText).toBe("Line 1\nLine 2");
    });

    it("preserves multiple newlines", async () => {
      const runs = [run("A\n\nB")];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      const fullText = result.map((r) => r.text).join("");
      expect(fullText).toBe("A\n\nB");
    });

    it("preserves styled runs across paragraphs", async () => {
      const runs = [run("Bold line\n", { fontWeight: "bold" }), run("Normal line")];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      const fullText = result.map((r) => r.text).join("");
      expect(fullText).toBe("Bold line\nNormal line");

      // Newline inherits preceding style, so mergeAdjacentRuns merges it with the bold run
      const boldRun = result.find((r) => r.style.fontWeight === "bold");
      expect(boldRun).toBeDefined();
      expect(boldRun!.text).toBe("Bold line\n");
    });

    it("newline inherits style from preceding run", async () => {
      const runs = [run("Big\n", { fontSize: 48 }), run("Small", { fontSize: 12 })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());
      // The \n should inherit fontSize 48 from the preceding run
      const nlRun = result.find((r) => r.text.includes("\n"));
      expect(nlRun).toBeDefined();
      expect(nlRun!.style.fontSize).toBe(48);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty runs array", async () => {
      await applyRuns([]);

      const result = editorStateToRuns(editor.getEditorState());

      // Should result in empty or single empty-text run
      const fullText = result.map((r) => r.text).join("");
      expect(fullText).toBe("");
    });

    it("handles single character", async () => {
      await applyRuns([run("X", { fontSize: 12 })]);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("X");
      expect(result[0].style.fontSize).toBe(12);
    });

    it("handles all style properties combined", async () => {
      const runs = [
        run("Full", {
          fontSize: 32,
          fontFamily: "Courier New",
          fontWeight: "bold",
          fontStyle: "italic",
          fill: "#ff8800",
          letterSpacing: 3,
          textDecoration: "underline",
        }),
      ];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.fontSize).toBe(32);
      expect(result[0].style.fontFamily).toBe("Courier New");
      expect(result[0].style.fontWeight).toBe("bold");
      expect(result[0].style.fontStyle).toBe("italic");
      expect(result[0].style.fill).toBe("#ff8800");
      expect(result[0].style.letterSpacing).toBe(3);
      expect(result[0].style.textDecoration).toBe("underline");
    });

    it("preserves backgroundColor via CSS string", async () => {
      const runs = [run("Highlighted", { backgroundColor: "#ffff00" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.backgroundColor).toBe("#ffff00");
    });

    it("preserves textTransform via CSS string", async () => {
      const runs = [run("Upper", { textTransform: "uppercase" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.textTransform).toBe("uppercase");
    });

    it("preserves backgroundColor + textTransform combined", async () => {
      const runs = [run("Combo", { backgroundColor: "#00ff00", textTransform: "capitalize" })];
      await applyRuns(runs);

      const result = editorStateToRuns(editor.getEditorState());

      expect(result).toHaveLength(1);
      expect(result[0].style.backgroundColor).toBe("#00ff00");
      expect(result[0].style.textTransform).toBe("capitalize");
    });
  });

  // ── Helper ────────────────────────────────────────────────────────

  function applyRuns(runs: TextRun[]): Promise<void> {
    return new Promise<void>((resolve) => {
      runsToEditorState(editor, runs);
      // Lexical batches updates — resolve on next microtask
      queueMicrotask(resolve);
    });
  }
});
