import { prepareDocumentLoad } from "./document-migration";
import { getDocumentRootSceneId, getDocumentState } from "./document-state";
import {
  EDITX_DOCUMENT_KIND,
  EDITX_DOCUMENT_SCHEMA_VERSION,
  type EditxDocumentV1,
} from "./document-types";
import type { EngineCore } from "./engine-core";
import { collectSceneBlocks, loadPreparedDocument } from "./scene-serialization";

export function saveDocumentToString(engine: EngineCore): string {
  const state = getDocumentState(engine);
  const payload: EditxDocumentV1 = {
    kind: EDITX_DOCUMENT_KIND,
    schemaVersion: EDITX_DOCUMENT_SCHEMA_VERSION,
    id: state.id,
    metadata: state.metadata,
    scene: {
      rootSceneId: getDocumentRootSceneId(engine),
      blocks: collectSceneBlocks(engine),
    },
  };
  return JSON.stringify(payload);
}

export async function loadDocumentFromString(engine: EngineCore, json: string): Promise<void> {
  const payload: unknown = JSON.parse(json);
  return loadPreparedDocument(engine, prepareDocumentLoad(payload));
}
