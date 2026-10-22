import type { ReadonlyBlockData } from "./block";

export const EDITX_DOCUMENT_KIND = "editx-document" as const;
export const EDITX_DOCUMENT_SCHEMA_VERSION = 1 as const;

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export type JsonObject = {
  readonly [key: string]: JsonValue;
};

export type DocumentMetadata = JsonObject;

export interface EditxDocumentSceneV1 {
  /**
   * The authored root scene block.
   *
   * Null is allowed for an empty engine/document. It is not runtime navigation.
   */
  readonly rootSceneId: number | null;

  /** Complete persisted block state, including authored visibility. */
  readonly blocks: readonly ReadonlyBlockData[];
}

export interface EditxDocumentV1 {
  readonly kind: typeof EDITX_DOCUMENT_KIND;
  readonly schemaVersion: typeof EDITX_DOCUMENT_SCHEMA_VERSION;

  /**
   * Stable, opaque identity for this logical document.
   * Consumers must not depend on its generated format.
   */
  readonly id: string;

  /** JSON-only host/document metadata. */
  readonly metadata: DocumentMetadata;

  readonly scene: EditxDocumentSceneV1;
}

export type EditxDocument = EditxDocumentV1;
