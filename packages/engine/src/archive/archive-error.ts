import type { EditxArchiveLimitName } from "./archive-limits";

export type EditxArchiveErrorCode =
  | "INVALID_ARCHIVE"
  | "LIMIT_EXCEEDED"
  | "UNSAFE_PATH"
  | "DUPLICATE_PATH"
  | "UNSUPPORTED_FEATURE"
  | "UNSUPPORTED_COMPRESSION"
  | "UNKNOWN_MEMBER"
  | "MISSING_MEMBER"
  | "UNSUPPORTED_VERSION"
  | "INVALID_MANIFEST"
  | "INVALID_DOCUMENT"
  | "INVALID_PREVIEW"
  | "INTEGRITY_CHECK_FAILED";

export class EditxArchiveError extends Error {
  readonly entryPath?: string;
  readonly limit?: EditxArchiveLimitName;
  readonly cause?: unknown;

  constructor(
    readonly code: EditxArchiveErrorCode,
    message: string,
    details: { entryPath?: string; limit?: EditxArchiveLimitName; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "EditxArchiveError";
    this.entryPath = details.entryPath;
    this.limit = details.limit;
    this.cause = details.cause;
  }
}
