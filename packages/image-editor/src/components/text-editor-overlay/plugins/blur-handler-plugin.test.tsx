import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from "@lexical/react/LexicalComposerContext";
import { render } from "@testing-library/react";
import { BLUR_COMMAND, createEditor, type LexicalEditor } from "lexical";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlurHandlerPlugin } from "./blur-handler-plugin";

/**
 * Wraps a plugin in a real (headless) Lexical editor context so we can drive
 * the registered BLUR_COMMAND exactly like Lexical would on a real blur.
 */
function renderWithEditor(editor: LexicalEditor, node: React.ReactNode) {
  const ctx: [LexicalEditor, ReturnType<typeof createLexicalComposerContext>] = [
    editor,
    createLexicalComposerContext(null, { paragraph: "lexical-paragraph" }),
  ];
  return render(
    <LexicalComposerContext.Provider value={ctx}>{node}</LexicalComposerContext.Provider>,
  );
}

/** Minimal focus-event stand-in — the plugin only reads `relatedTarget`. */
function blurEvent(relatedTarget: HTMLElement | null): FocusEvent {
  return { relatedTarget } as unknown as FocusEvent;
}

describe("BlurHandlerPlugin", () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    vi.useFakeTimers();
    editor = createEditor({
      namespace: "test",
      onError: (e) => {
        throw e;
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("does NOT close when focus moves to a toolbar element (fast path)", () => {
    const onClose = vi.fn();
    renderWithEditor(editor, <BlurHandlerPlugin onClose={onClose} />);

    const toolbar = document.createElement("div");
    toolbar.setAttribute("data-text-toolbar", "");
    const child = document.createElement("button");
    toolbar.appendChild(child);
    document.body.appendChild(toolbar);

    editor.dispatchCommand(BLUR_COMMAND, blurEvent(child));
    vi.advanceTimersByTime(50);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does NOT close when the active element is inside a toolbar (delayed path)", () => {
    const onClose = vi.fn();
    renderWithEditor(editor, <BlurHandlerPlugin onClose={onClose} />);

    const toolbar = document.createElement("div");
    toolbar.setAttribute("data-text-toolbar", "");
    const input = document.createElement("input");
    toolbar.appendChild(input);
    document.body.appendChild(toolbar);
    input.focus();

    // relatedTarget is null (Radix portal case) → falls through to delayed check.
    editor.dispatchCommand(BLUR_COMMAND, blurEvent(null));
    vi.advanceTimersByTime(50);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on a genuine outside blur", () => {
    const onClose = vi.fn();
    renderWithEditor(editor, <BlurHandlerPlugin onClose={onClose} />);

    // No related target, nothing focused inside editor/toolbar/portal.
    editor.dispatchCommand(BLUR_COMMAND, blurEvent(null));
    expect(onClose).not.toHaveBeenCalled(); // deferred, not immediate

    vi.advanceTimersByTime(20);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close while focus stays inside a Radix popover portal", () => {
    const onClose = vi.fn();
    renderWithEditor(editor, <BlurHandlerPlugin onClose={onClose} />);

    const portal = document.createElement("div");
    portal.setAttribute("data-radix-popper-content-wrapper", "");
    const item = document.createElement("button");
    portal.appendChild(item);
    document.body.appendChild(portal);
    item.focus();

    editor.dispatchCommand(BLUR_COMMAND, blurEvent(null));
    vi.advanceTimersByTime(50);

    expect(onClose).not.toHaveBeenCalled();
  });
});
