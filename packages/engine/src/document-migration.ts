import { firstScenePage } from "./active-page";
import type { BlockData } from "./block/block.types";
import {
  type DocumentMetadata,
  EDITX_DOCUMENT_KIND,
  EDITX_DOCUMENT_SCHEMA_VERSION,
} from "./document-types";
import {
  type ValidatedLegacyScene,
  validateDocument,
  validateLegacyScene,
} from "./document-validation";
import { hasOwn, isRecord } from "./document-validation-context";

const target = Object.freeze({
  namespace: "native" as const,
  kind: EDITX_DOCUMENT_KIND,
  schemaVersion: EDITX_DOCUMENT_SCHEMA_VERSION,
});

type DocumentIdentityPlan =
  | { readonly mode: "preserve"; readonly id: string }
  | { readonly mode: "fresh" };

export interface PreparedDocumentLoad {
  readonly target: typeof target;
  readonly identity: DocumentIdentityPlan;
  readonly metadata: DocumentMetadata;
  readonly scene: {
    readonly rootSceneId: number | null;
    readonly blocks: readonly BlockData[];
  };
  readonly navigation: {
    readonly sceneId: number | null;
    readonly pageId: number | null;
  };
}

export function migrateLegacySceneV1ToV2(
  source: Extract<ValidatedLegacyScene, { version: 1 }>,
): Extract<ValidatedLegacyScene, { version: 2 }> {
  return {
    ...source,
    version: 2,
    activeSceneId: source.activeSceneId ?? null,
    activePageId: source.activePageId ?? null,
  };
}

export function convertLegacySceneV2ToNativeLoad(
  source: Extract<ValidatedLegacyScene, { version: 2 }>,
): PreparedDocumentLoad {
  const sceneId = source.activeSceneId ?? null;
  const blocks = new Map(source.blocks.map((block) => [block.id, block]));
  return {
    target,
    identity: { mode: "fresh" },
    metadata: Object.freeze({}),
    scene: { rootSceneId: sceneId, blocks: source.blocks },
    navigation: {
      sceneId,
      pageId: source.activePageId ?? firstScenePage(blocks, sceneId),
    },
  };
}

function normalizeNativeDocumentV1(
  source: ReturnType<typeof validateDocument>,
): PreparedDocumentLoad {
  const blocks = new Map(source.scene.blocks.map((block) => [block.id, block]));
  return {
    target,
    identity: { mode: "preserve", id: source.id },
    metadata: source.metadata,
    scene: source.scene,
    navigation: {
      sceneId: source.scene.rootSceneId,
      pageId: firstScenePage(blocks, source.scene.rootSceneId),
    },
  };
}

export function prepareLegacySceneLoad(payload: unknown): PreparedDocumentLoad {
  const source = validateLegacyScene(payload);
  const latest = source.version === 1 ? migrateLegacySceneV1ToV2(source) : source;
  return convertLegacySceneV2ToNativeLoad(latest);
}

export function prepareDocumentLoad(payload: unknown): PreparedDocumentLoad {
  if (isRecord(payload) && (hasOwn(payload, "kind") || hasOwn(payload, "schemaVersion"))) {
    return normalizeNativeDocumentV1(validateDocument(payload));
  }
  return prepareLegacySceneLoad(payload);
}
