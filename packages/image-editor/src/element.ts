import type {
  CloseReason,
  EditorEventCallbacks,
  EditorSlots,
  ImageEditorConfig,
} from "./config/config.types";
import type { ImageSource } from "./image-editor";
import type { ImageValidationOptions } from "./utils/validate-image";
import {
  type CreateImageEditorOptions,
  createImageEditor,
  type ImageEditorInstance,
} from "./vanilla";

const DEFAULT_TAG = "editx-image-editor";

/**
 * Light-DOM custom element wrapping {@link createImageEditor}.
 *
 * Simple inputs are accepted as HTML attributes (`src`, `width`, `height`);
 * complex inputs (`config`, `slots`, `events`, `validation`, callbacks, or a
 * non-string `src` such as a File/Blob) are set as JS properties. Save and close
 * also dispatch bubbling `save` / `close` CustomEvents for non-React consumers.
 *
 * Shadow DOM is intentionally NOT used: the editor relies on Radix portals
 * (appended to document.body) and global Tailwind classes, both of which a
 * shadow root would break.
 */
export class EditxImageEditorElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["src", "width", "height"];
  }

  private instance: ImageEditorInstance | null = null;

  private _src?: ImageSource;
  private _config?: ImageEditorConfig;
  private _slots?: EditorSlots;
  private _events?: EditorEventCallbacks;
  private _validation?: ImageValidationOptions;
  private _onSave?: (blob: Blob) => void;
  private _onClose?: (reason?: CloseReason, hasUnsavedChanges?: boolean) => void;

  connectedCallback(): void {
    if (this.style.display === "") this.style.display = "block";
    this.mount();
  }

  disconnectedCallback(): void {
    this.instance?.destroy();
    this.instance = null;
  }

  attributeChangedCallback(): void {
    if (this.instance) this.instance.update(this.buildOptions());
  }

  // ── Property accessors for complex inputs ──

  set src(value: ImageSource | undefined) {
    this._src = value;
    this.sync();
  }
  get src(): ImageSource | undefined {
    return this._src ?? this.getAttribute("src") ?? undefined;
  }

  set config(value: ImageEditorConfig | undefined) {
    this._config = value;
    this.sync();
  }
  get config(): ImageEditorConfig | undefined {
    return this._config;
  }

  set slots(value: EditorSlots | undefined) {
    this._slots = value;
    this.sync();
  }
  get slots(): EditorSlots | undefined {
    return this._slots;
  }

  set events(value: EditorEventCallbacks | undefined) {
    this._events = value;
    this.sync();
  }
  get events(): EditorEventCallbacks | undefined {
    return this._events;
  }

  set validation(value: ImageValidationOptions | undefined) {
    this._validation = value;
    this.sync();
  }
  get validation(): ImageValidationOptions | undefined {
    return this._validation;
  }

  set onSave(value: ((blob: Blob) => void) | undefined) {
    this._onSave = value;
    this.sync();
  }
  set onClose(value: ((reason?: CloseReason, hasUnsavedChanges?: boolean) => void) | undefined) {
    this._onClose = value;
    this.sync();
  }

  // ── Internals ──

  private buildOptions(): CreateImageEditorOptions {
    const width = this.getAttribute("width") ?? undefined;
    const height = this.getAttribute("height") ?? undefined;

    return {
      src: this.src as ImageSource,
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      config: this._config,
      slots: this._slots,
      events: this._events,
      validation: this._validation,
      onSave: (blob) => {
        this._onSave?.(blob);
        this.dispatchEvent(new CustomEvent("save", { detail: { blob }, bubbles: true }));
      },
      onClose: (reason, hasUnsavedChanges) => {
        this._onClose?.(reason, hasUnsavedChanges);
        this.dispatchEvent(
          new CustomEvent("close", { detail: { reason, hasUnsavedChanges }, bubbles: true }),
        );
      },
    };
  }

  private mount(): void {
    if (!this.src) return;
    this.instance = createImageEditor(this, this.buildOptions());
  }

  private sync(): void {
    if (!this.isConnected) return;
    if (this.instance) {
      this.instance.update(this.buildOptions());
    } else {
      this.mount();
    }
  }
}

/**
 * Register the custom element. Idempotent — safe to call multiple times and
 * across modules.
 *
 * @param tagName Custom tag name (default `editx-image-editor`).
 */
export function defineImageEditorElement(tagName: string = DEFAULT_TAG): void {
  if (typeof customElements === "undefined") return;
  if (customElements.get(tagName)) return;
  customElements.define(tagName, EditxImageEditorElement);
}
