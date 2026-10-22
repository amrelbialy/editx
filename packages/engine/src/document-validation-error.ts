export type DocumentValidationIssueCode =
  | "UNSUPPORTED_KIND"
  | "UNSUPPORTED_VERSION"
  | "MISSING_FIELD"
  | "INVALID_FIELD"
  | "DUPLICATE_BLOCK_ID"
  | "MISSING_BLOCK_REFERENCE"
  | "INVALID_BLOCK_TYPE"
  | "INVALID_BLOCK_OWNERSHIP"
  | "CYCLIC_BLOCK_GRAPH";

export interface DocumentValidationIssue {
  readonly code: DocumentValidationIssueCode;
  /** Path from the parsed payload root. */
  readonly path: readonly (string | number)[];
  /** Source block containing the invalid field, when unambiguous. */
  readonly blockId?: number;
  readonly message: string;
}

export class DocumentValidationError extends Error {
  readonly issues: readonly DocumentValidationIssue[];

  constructor(issues: readonly DocumentValidationIssue[]) {
    if (issues.length === 0) throw new TypeError("Validation errors require at least one issue");
    super(`Document validation failed: ${issues[0].message}`);
    this.name = "DocumentValidationError";
    this.issues = Object.freeze(
      issues.map((issue) => Object.freeze({ ...issue, path: Object.freeze([...issue.path]) })),
    );
  }
}
