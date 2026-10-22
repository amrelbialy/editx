import type { BlockData } from "./block/block.types";
import { readDocumentBlocks } from "./document-block-validation";
import { validateBlockGraph } from "./document-graph-validation";
import { cloneDocumentMetadata } from "./document-json";
import { EDITX_DOCUMENT_KIND, EDITX_DOCUMENT_SCHEMA_VERSION } from "./document-types";
import {
  hasOwn,
  isNullableId,
  isRecord,
  isString,
  ValidationContext,
} from "./document-validation-context";

interface LegacySceneFields {
  readonly blocks: BlockData[];
  readonly activeSceneId?: number | null;
  readonly activePageId?: number | null;
}

export type ValidatedLegacyScene = LegacySceneFields &
  ({ readonly version: 1 } | { readonly version: 2 });

function validateSceneReference(
  blocks: Map<number, BlockData>,
  sceneId: number | null,
  context: ValidationContext,
): void {
  if (sceneId === null) return;
  const scene = blocks.get(sceneId);
  if (!scene) context.fail("MISSING_BLOCK_REFERENCE", `Scene ${sceneId} does not exist`);
  else if (scene.type !== "scene")
    context.fail("INVALID_BLOCK_TYPE", `Scene ${sceneId} is not a scene`);
}

function readId(value: unknown, context: ValidationContext): number | null {
  if (isNullableId(value)) return value;
  context.fail(
    "INVALID_FIELD",
    "Reference must be a non-negative allocatable safe integer or null",
  );
  context.throwIfInvalid();
  return null;
}

function readBlocks(value: unknown, context: ValidationContext): BlockData[] {
  const blocks = readDocumentBlocks(value, context);
  validateBlockGraph(blocks, context);
  return blocks;
}

export function validateDocument(payload: Record<string, unknown>) {
  const context = new ValidationContext();
  if (!hasOwn(payload, "kind"))
    context.at("kind").fail("MISSING_FIELD", "Document kind is required");
  else if (payload.kind !== EDITX_DOCUMENT_KIND)
    context.at("kind").fail("UNSUPPORTED_KIND", "Unsupported document kind");
  if (!hasOwn(payload, "schemaVersion"))
    context.at("schemaVersion").fail("MISSING_FIELD", "Document schema version is required");
  else if (payload.schemaVersion !== EDITX_DOCUMENT_SCHEMA_VERSION)
    context.at("schemaVersion").fail("UNSUPPORTED_VERSION", "Unsupported document schema version");
  context.throwIfInvalid();
  context.field(payload, "id", isString, "Document id must be a non-empty string");
  if (payload.id === "")
    context.at("id").fail("INVALID_FIELD", "Document id must be a non-empty string");
  context.field(payload, "metadata", isRecord, "Document metadata must be a JSON object");
  context.field(payload, "scene", isRecord, "Document scene must be an object");
  context.throwIfInvalid();
  // Retain the checked shape explicitly rather than casting parsed input.
  if (typeof payload.id !== "string" || !isRecord(payload.scene)) {
    throw new TypeError("Invalid validated document header");
  }
  const metadata = cloneDocumentMetadata(payload.metadata, context.at("metadata"));
  const sceneContext = context.at("scene");
  sceneContext.field(
    payload.scene,
    "rootSceneId",
    isNullableId,
    "Document rootSceneId must be a valid block ID or null",
  );
  sceneContext.field(
    payload.scene,
    "blocks",
    Array.isArray,
    "Document scene must contain a blocks array",
  );
  context.throwIfInvalid();
  const rootSceneId = readId(payload.scene.rootSceneId, sceneContext.at("rootSceneId"));
  const blocks = readBlocks(payload.scene.blocks, sceneContext.at("blocks"));
  const candidate = new Map(blocks.map((block) => [block.id, block]));
  validateSceneReference(candidate, rootSceneId, sceneContext.at("rootSceneId"));
  context.throwIfInvalid();
  return {
    kind: EDITX_DOCUMENT_KIND,
    schemaVersion: EDITX_DOCUMENT_SCHEMA_VERSION,
    id: payload.id,
    metadata,
    scene: { rootSceneId, blocks },
  };
}

function readLegacyVersion(payload: Record<string, unknown>, context: ValidationContext): 1 | 2 {
  if (!hasOwn(payload, "version"))
    context.at("version").fail("MISSING_FIELD", "Scene version is required");
  else if (payload.version === 1 || payload.version === 2) return payload.version;
  else context.at("version").fail("UNSUPPORTED_VERSION", "Unsupported scene version");
  context.throwIfInvalid();
  throw new TypeError("Invalid validated scene version");
}

export function validateLegacyScene(payload: unknown): ValidatedLegacyScene {
  const context = new ValidationContext();
  if (!isRecord(payload)) {
    context.fail("INVALID_FIELD", "Scene payload must be an object");
    context.throwIfInvalid();
    throw new TypeError("Invalid scene payload");
  }
  const version = readLegacyVersion(payload, context);
  context.field(payload, "blocks", Array.isArray, "Invalid scene data: missing blocks array");
  const sceneId = readId(payload.activeSceneId ?? null, context.at("activeSceneId"));
  const requestedPageId = readId(payload.activePageId ?? null, context.at("activePageId"));
  context.throwIfInvalid();
  const blocks = readBlocks(payload.blocks, context.at("blocks"));
  const candidate = new Map(blocks.map((block) => [block.id, block]));
  validateSceneReference(candidate, sceneId, context.at("activeSceneId"));
  if (requestedPageId !== null) {
    const page = candidate.get(requestedPageId);
    const field = context.at("activePageId");
    if (!page) field.fail("MISSING_BLOCK_REFERENCE", `Page ${requestedPageId} does not exist`);
    else if (page.type !== "page")
      field.fail("INVALID_BLOCK_TYPE", `Block ${requestedPageId} is not a page`);
    else if (
      sceneId === null ||
      page.parentId !== sceneId ||
      !candidate.get(sceneId)?.children.includes(page.id)
    )
      field.fail("INVALID_BLOCK_OWNERSHIP", "Active page must belong to the active scene");
  }
  context.throwIfInvalid();
  return {
    version,
    blocks,
    ...(hasOwn(payload, "activeSceneId") ? { activeSceneId: sceneId } : {}),
    ...(hasOwn(payload, "activePageId") ? { activePageId: requestedPageId } : {}),
  };
}
