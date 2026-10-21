import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EditxImageEditorElement } from "./element";
import { createImageEditor } from "./vanilla";

vi.mock("./vanilla", () => ({
  createImageEditor: vi.fn(() => ({ update: vi.fn(), destroy: vi.fn() })),
}));

const TAG = "editx-a10-save";
let element: EditxImageEditorElement;

beforeAll(() => customElements.define(TAG, EditxImageEditorElement));
beforeEach(() => {
  vi.clearAllMocks();
  element = document.createElement(TAG) as EditxImageEditorElement;
  element.src = "/photo.png";
});
afterEach(() => element.remove());

describe("custom element save delivery", () => {
  it("passes ZIP blobs through the callback and bubbling save event after async save completes", async () => {
    let finish!: () => void;
    element.onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const listener = vi.fn();
    element.addEventListener("save", listener);
    document.body.appendChild(element);
    const options = vi.mocked(createImageEditor).mock.calls[0][1];
    const blob = new Blob(["zip"], { type: "application/zip" });
    const completion = options.onSave?.(blob);
    expect(listener).not.toHaveBeenCalled();
    finish();
    await completion;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({ bubbles: true, detail: { blob } });
  });

  it("propagates rejected host saves without emitting a successful save event", async () => {
    element.onSave = vi.fn().mockRejectedValue(new Error("Upload rejected"));
    const listener = vi.fn();
    element.addEventListener("save", listener);
    document.body.appendChild(element);
    const options = vi.mocked(createImageEditor).mock.calls[0][1];
    await expect(options.onSave?.(new Blob(["image"]))).rejects.toThrow("Upload rejected");
    expect(listener).not.toHaveBeenCalled();
  });
});
