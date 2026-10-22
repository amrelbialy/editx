import type { BlockData, BlockType } from "./block/block.types";
import { BLOCK_TYPES, validateProperties } from "./document-property-validation";
import {
  hasOwn,
  isBlockId,
  isNullableId,
  isRecord,
  isString,
  type ValidationContext,
} from "./document-validation-context";

function isBlockType(value: unknown): value is BlockType {
  return typeof value === "string" && BLOCK_TYPES.some((type) => type === value);
}

function validateBlock(value: unknown, context: ValidationContext): value is BlockData {
  if (!isRecord(value)) return context.fail("INVALID_FIELD", "Block must be an object");
  let valid = true;
  const fields = [
    context.field(
      value,
      "id",
      isBlockId,
      "Block id must be a non-negative allocatable safe integer",
    ),
    context.field(value, "kind", isString, "Block kind must be a string"),
    context.field(value, "name", isString, "Block name must be a string"),
    ...["parentId", "shapeId", "fillId"].map((key) =>
      context.field(value, key, isNullableId, `${key} must be a block ID or null`),
    ),
  ];
  if (!hasOwn(value, "type")) {
    context.at("type").fail("MISSING_FIELD", "Block type is required");
    valid = false;
  } else if (!isBlockType(value.type)) {
    context.at("type").fail("INVALID_BLOCK_TYPE", "Block type is invalid");
    valid = false;
  }
  if (fields.includes(false)) valid = false;
  for (const key of ["children", "effectIds"]) {
    if (!context.field(value, key, Array.isArray, `${key} must be an array`)) {
      valid = false;
      continue;
    }
    const list = value[key];
    if (!Array.isArray(list)) continue;
    list.forEach((id, index) => {
      if (!isBlockId(id)) {
        context.at(key).at(index).fail("INVALID_FIELD", "Reference must be a valid block ID");
        valid = false;
      }
    });
  }
  if (!hasOwn(value, "properties")) {
    context.at("properties").fail("MISSING_FIELD", "Block properties are required");
    valid = false;
  } else if (!validateProperties(value.properties, context.at("properties"))) valid = false;
  return valid;
}

export function readDocumentBlocks(value: unknown, context: ValidationContext): BlockData[] {
  if (!Array.isArray(value)) {
    context.fail("INVALID_FIELD", "Document scene must contain a blocks array");
    context.throwIfInvalid();
    return [];
  }
  const blocks: BlockData[] = [];
  const ids = new Set<number>();
  const duplicates = new Set<number>();
  for (const entry of value) {
    if (isRecord(entry) && isBlockId(entry.id)) {
      if (ids.has(entry.id)) duplicates.add(entry.id);
      ids.add(entry.id);
    }
  }
  value.forEach((entry, index) => {
    const id =
      isRecord(entry) && isBlockId(entry.id) && !duplicates.has(entry.id) ? entry.id : undefined;
    const blockContext = context.at(index, id);
    if (validateBlock(entry, blockContext)) blocks.push(entry);
    if (isRecord(entry) && isBlockId(entry.id) && duplicates.has(entry.id)) {
      blockContext.at("id").fail("DUPLICATE_BLOCK_ID", `Duplicate block ID ${entry.id}`);
    }
  });
  context.throwIfInvalid();
  return blocks;
}
