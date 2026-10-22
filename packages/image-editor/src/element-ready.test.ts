import { EditxEngine } from "@editx/engine";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EditxImageEditorElement } from "./element";
import { createEditorHandle } from "./utils/create-editor-handle";
import { createImageEditor } from "./vanilla";

vi.mock("./vanilla", () => ({
  createImageEditor: vi.fn(() => ({ update: vi.fn(), destroy: vi.fn() })),
}));

const TAG = "editx-project-ready";
let element: EditxImageEditorElement;

beforeAll(() => customElements.define(TAG, EditxImageEditorElement));
beforeEach(() => {
  vi.clearAllMocks();
  element = document.createElement(TAG) as EditxImageEditorElement;
  element.src = "/photo.png";
});
afterEach(() => element.remove());

describe("custom element project handle parity", () => {
  it("delivers the same full handle through onReady and a bubbling ready event", () => {
    const engine = new EditxEngine();
    const handle = createEditorHandle(engine, { current: engine });
    const ready = vi.fn();
    const listener = vi.fn();
    const save = vi.fn();
    element.onReady = ready;
    element.addEventListener("ready", listener);
    element.addEventListener("save", save);
    document.body.appendChild(element);
    const options = vi.mocked(createImageEditor).mock.calls[0][1];
    options.onReady?.(handle);
    expect(ready).toHaveBeenCalledWith(handle);
    expect(listener.mock.calls[0][0]).toMatchObject({
      bubbles: true,
      detail: { handle },
    });
    expect(typeof handle.saveProject).toBe("function");
    expect(typeof handle.loadProject).toBe("function");
    expect(save).not.toHaveBeenCalled();
    engine.dispose();
  });
});
