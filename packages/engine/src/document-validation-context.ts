import {
  DocumentValidationError,
  type DocumentValidationIssue,
  type DocumentValidationIssueCode,
} from "./document-validation-error";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export const hasOwn = (value: object, key: PropertyKey): boolean =>
  Object.getOwnPropertyDescriptor(value, key) !== undefined;

export function isBlockId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value < Number.MAX_SAFE_INTEGER
  );
}

export function isNullableId(value: unknown): value is number | null {
  return value === null || isBlockId(value);
}

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
export const isString = (value: unknown): value is string => typeof value === "string";

export class ValidationContext {
  constructor(
    readonly issues: DocumentValidationIssue[] = [],
    readonly path: readonly (string | number)[] = [],
    readonly blockId?: number,
  ) {}

  at(key: string | number, blockId = this.blockId): ValidationContext {
    return new ValidationContext(this.issues, [...this.path, key], blockId);
  }

  fail(code: DocumentValidationIssueCode, message: string): false {
    this.issues.push({
      code,
      path: this.path,
      ...(this.blockId === undefined ? {} : { blockId: this.blockId }),
      message,
    });
    return false;
  }

  field<T>(
    object: Record<string, unknown>,
    key: string,
    guard: (value: unknown) => value is T,
    message: string,
  ): boolean {
    const context = this.at(key);
    if (!hasOwn(object, key)) return context.fail("MISSING_FIELD", message);
    return guard(object[key]) || context.fail("INVALID_FIELD", message);
  }

  throwIfInvalid(): void {
    if (this.issues.length) throw new DocumentValidationError(this.issues);
  }
}
