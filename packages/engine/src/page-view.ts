export type PageViewMode = "all-pages" | "active-page" | "vertical-pages" | "horizontal-pages";

export interface RendererPageViewPage {
  readonly id: number;
  readonly width: number;
  readonly height: number;
}

export interface PageViewBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type RendererPageView =
  | Readonly<{ mode: "all-pages" }>
  | Readonly<{ mode: "active-page"; activePageId: number | null }>
  | Readonly<{
      mode: "vertical-pages" | "horizontal-pages";
      activePageId: number | null;
      pages: readonly RendererPageViewPage[];
    }>;

export type PageViewErrorCode = "NO_RENDERER" | "UNSUPPORTED_RENDERER" | "ENGINE_DISPOSED";

export class PageViewError extends Error {
  readonly code: PageViewErrorCode;

  constructor(code: PageViewErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "PageViewError";
    this.code = code;
    if (options && "cause" in options) {
      Object.defineProperty(this, "cause", {
        configurable: true,
        value: options.cause,
        writable: true,
      });
    }
  }
}
