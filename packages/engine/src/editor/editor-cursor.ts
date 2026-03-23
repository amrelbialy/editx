import type { CursorType } from "../editor-types";
import type { EditorContext } from "./editor-context";

/**
 * Manages cursor state: type, rotation, and text-cursor screen position.
 * Operates on the shared EditorContext.
 */
export class EditorCursor {
  #ctx: EditorContext;
  #cursorType: CursorType = "default";
  #cursorRotation = 0;
  #textCursorScreenX = 0;
  #textCursorScreenY = 0;

  constructor(ctx: EditorContext) {
    this.#ctx = ctx;
  }

  /**
   * Set the cursor type that should be displayed.
   */
  setCursorType(type: CursorType): void {
    this.#cursorType = type;
    this.#ctx.renderer?.setCursor?.(type);
  }

  /**
   * Get the cursor type that should be displayed.
   */
  getCursorType(): CursorType {
    return this.#cursorType;
  }

  /**
   * Set the cursor rotation angle (in degrees).
   */
  setCursorRotation(degrees: number): void {
    this.#cursorRotation = degrees;
  }

  /**
   * Get the cursor rotation angle (in degrees).
   */
  getCursorRotation(): number {
    return this.#cursorRotation;
  }

  /**
   * Set the text cursor's position in screen space.
   */
  setTextCursorPositionInScreenSpace(x: number, y: number): void {
    this.#textCursorScreenX = x;
    this.#textCursorScreenY = y;
  }

  /**
   * Get the text cursor's x position in screen space.
   */
  getTextCursorPositionInScreenSpaceX(): number {
    return this.#textCursorScreenX;
  }

  /**
   * Get the text cursor's y position in screen space.
   */
  getTextCursorPositionInScreenSpaceY(): number {
    return this.#textCursorScreenY;
  }
}
