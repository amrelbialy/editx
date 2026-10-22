import {
  createEditxArchive,
  type EditxArchiveInfoV1,
  readEditxArchive,
  type SaveEditxArchiveOptions,
} from "./archive";
import { archiveInfo } from "./archive/document-archive";
import type { DocumentChangedCallback } from "./document-change";
import { getDocumentChanges } from "./document-change-tracker";
import { cloneDocumentMetadata } from "./document-json";
import { loadDocumentFromString, saveDocumentToString } from "./document-serialization";
import { getDocumentRootSceneId, getDocumentState } from "./document-state";
import type { DocumentMetadata } from "./document-types";
import { exportDocumentPreview } from "./editx-engine-export";
import type { EngineCore } from "./engine-core";

export type {
  DocumentChangedCallback,
  DocumentChangedEvent,
  DocumentChangeOrigin,
} from "./document-change";
export type * from "./document-types";
export { EDITX_DOCUMENT_KIND, EDITX_DOCUMENT_SCHEMA_VERSION } from "./document-types";
export {
  DocumentValidationError,
  type DocumentValidationIssue,
  type DocumentValidationIssueCode,
} from "./document-validation-error";

export class DocumentAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  /** Subscribe to settled persisted changes, independently of history recording or rendering. */
  onChanged(callback: DocumentChangedCallback): () => void {
    return getDocumentChanges(this.#engine).subscribe(callback);
  }

  /** Identity of the current logical document. */
  getId(): string {
    return getDocumentState(this.#engine).id;
  }

  /** Authored root scene, distinct from active-scene navigation. */
  getRootSceneId(): number | null {
    return getDocumentRootSceneId(this.#engine);
  }

  /** Deeply immutable document metadata snapshot. */
  getMetadata(): DocumentMetadata {
    return cloneDocumentMetadata(getDocumentState(this.#engine).metadata);
  }

  /** Serialize the authoritative v1 `.editx.json` representation. */
  saveToString(): string {
    return saveDocumentToString(this.#engine);
  }

  saveToArchive(options?: SaveEditxArchiveOptions): Uint8Array {
    return createEditxArchive({
      documentJson: this.saveToString(),
      ...(options?.preview !== undefined ? { preview: options.preview } : {}),
    });
  }

  /**
   * Load either an EditxDocumentV1 envelope or a legacy raw scene v1/v2 payload.
   *
   * Schema errors reject with DocumentValidationError before any live mutation.
   * Later renderer/setup failures do not imply rollback.
   */
  async loadFromString(json: string): Promise<void> {
    return loadDocumentFromString(this.#engine, json);
  }

  async loadFromArchive(bytes: Uint8Array): Promise<EditxArchiveInfoV1> {
    const result = readEditxArchive(bytes);
    await this.loadFromString(result.documentJson);
    return archiveInfo(result);
  }

  async exportPreview(): Promise<Blob | null> {
    return exportDocumentPreview(this.#engine);
  }
}
