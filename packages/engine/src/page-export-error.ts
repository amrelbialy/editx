export type PageExportErrorCode =
  | "NO_ACTIVE_SCENE"
  | "PAGE_NOT_FOUND"
  | "NO_RENDERER"
  | "UNSUPPORTED_RENDERER"
  | "IMAGE_LOAD_FAILED"
  | "FONT_LOAD_FAILED"
  | "RENDER_FAILED";

/** An identified page, resource, or rendering failure during page export. */
export class PageExportError extends Error {
  readonly blockId?: number;
  readonly resource?: string;
  readonly cause?: unknown;

  constructor(
    readonly code: PageExportErrorCode,
    readonly pageId: number,
    message: string,
    details: { blockId?: number; resource?: string; cause?: unknown } = {},
  ) {
    super(`Cannot export page ${pageId}: ${message}`);
    this.name = "PageExportError";
    this.blockId = details.blockId;
    this.resource = details.resource;
    this.cause = details.cause;
  }
}
