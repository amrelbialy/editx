import type { DocumentMetadata, JsonObject, JsonValue } from "./document-types";
import { isRecord, ValidationContext } from "./document-validation-context";

type JsonContainer = { [key: string]: JsonValue } | JsonValue[];

/** Clone and freeze without recursive calls, including deeply nested host metadata. */
export function cloneDocumentMetadata(
  value: unknown,
  context = new ValidationContext().at("metadata"),
): DocumentMetadata {
  if (!isRecord(value)) {
    context.fail("INVALID_FIELD", "Document metadata must be a JSON object");
    context.throwIfInvalid();
    throw new TypeError("Invalid document metadata");
  }
  const root: { [key: string]: JsonValue } = {};
  const seen = new WeakSet<object>();
  const stack: {
    input: object;
    output: JsonContainer;
    context: ValidationContext;
    exit?: boolean;
  }[] = [{ input: value, output: root, context }];
  while (stack.length) {
    const current = stack.pop()!;
    if (current.exit) {
      Object.freeze(current.output);
      seen.delete(current.input);
      continue;
    }
    const prototype = Object.getPrototypeOf(current.input);
    if (
      seen.has(current.input) ||
      (!Array.isArray(current.input) && prototype !== Object.prototype && prototype !== null) ||
      Reflect.ownKeys(current.input).some((key) => typeof key === "symbol")
    ) {
      current.context.fail("INVALID_FIELD", "Document metadata must contain acyclic JSON values");
      continue;
    }
    seen.add(current.input);
    stack.push({ ...current, exit: true });
    for (const [key, item] of Object.entries(current.input)) {
      const childContext = current.context.at(Array.isArray(current.input) ? Number(key) : key);
      let cloned: JsonValue;
      if (item === null || typeof item === "string" || typeof item === "boolean") {
        cloned = item;
      } else if (typeof item === "number" && Number.isFinite(item)) {
        cloned = item;
      } else if (item !== null && typeof item === "object") {
        const child: JsonContainer = Array.isArray(item) ? [] : {};
        cloned = child;
        stack.push({ input: item, output: child, context: childContext });
      } else {
        childContext.fail("INVALID_FIELD", "Document metadata must contain finite JSON values");
        continue;
      }
      Object.defineProperty(current.output, key, {
        value: cloned,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  context.throwIfInvalid();
  return root satisfies JsonObject;
}
