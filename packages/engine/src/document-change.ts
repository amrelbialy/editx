export type DocumentChangeOrigin = "edit" | "undo" | "redo" | "load" | "create";

export interface DocumentChangedEvent {
  readonly transactionId: number;
  readonly documentId: string;
  readonly origin: DocumentChangeOrigin;
  readonly changedBlockIds: readonly number[];
  readonly affectedPageIds: readonly number[];
}

export type DocumentChangedCallback = (event: DocumentChangedEvent) => void;
