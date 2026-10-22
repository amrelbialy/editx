import {
  createEditxArchive,
  EDITX_ARCHIVE_LIMITS,
  EDITX_ARCHIVE_MEDIA_TYPE,
  type EditxEngine,
  type ReadEditxArchiveResultV1,
  readEditxArchive,
} from "@editx/engine";
import { useImageEditorStore } from "../store/image-editor-store";
import { watchExportDocument } from "./export-document-guard";
import { synchronizePageTools } from "./page-editor-state";

export interface ProjectEngineRef {
  readonly current: EditxEngine | null;
}

export interface PreparedProjectFile {
  readonly engine: EditxEngine;
  readonly baseline: string;
  readonly bytes: Uint8Array;
  readonly archive: ReadEditxArchiveResultV1;
}

function requireEngine(ref: ProjectEngineRef): EditxEngine {
  if (!ref.current) throw new Error("The editor is not ready for project files.");
  return ref.current;
}

function assertEngine(ref: ProjectEngineRef, engine: EditxEngine): void {
  if (ref.current !== engine) throw new Error("The editor changed. Please try again.");
}

export async function saveProject(ref: ProjectEngineRef): Promise<Blob> {
  const engine = requireEngine(ref);
  const documentJson = engine.document.saveToString();
  const guard = watchExportDocument(engine, documentJson);
  try {
    const root = engine.document.getRootSceneId();
    const hasPage =
      root !== null &&
      engine.block.getChildren(root).some((id) => engine.block.getType(id) === "page");
    const previewBlob = await engine.document.exportPreview();
    assertEngine(ref, engine);
    guard.assertCurrent();
    if (hasPage && !previewBlob) throw new Error("This renderer cannot create a project preview.");
    const preview = previewBlob ? new Uint8Array(await previewBlob.arrayBuffer()) : undefined;
    assertEngine(ref, engine);
    guard.assertCurrent();
    const bytes = createEditxArchive({ documentJson, preview });
    assertEngine(ref, engine);
    guard.assertCurrent();
    return new Blob([new Uint8Array(bytes)], { type: EDITX_ARCHIVE_MEDIA_TYPE });
  } finally {
    guard.dispose();
  }
}

export async function prepareProjectFile(
  ref: ProjectEngineRef,
  source: Blob | Uint8Array,
): Promise<PreparedProjectFile> {
  const engine = requireEngine(ref);
  const baseline = engine.document.saveToString();
  const guard = watchExportDocument(engine, baseline);
  try {
    const size = source instanceof Uint8Array ? source.byteLength : source.size;
    if (size > EDITX_ARCHIVE_LIMITS.archiveBytes) {
      throw new RangeError("The project exceeds the 32 MiB archive limit.");
    }
    const bytes =
      source instanceof Uint8Array
        ? new Uint8Array(source)
        : new Uint8Array(await source.arrayBuffer());
    assertEngine(ref, engine);
    guard.assertCurrent();
    const archive = readEditxArchive(bytes);
    return { engine, baseline, bytes, archive };
  } finally {
    guard.dispose();
  }
}

export async function loadPreparedProject(ref: ProjectEngineRef, file: PreparedProjectFile) {
  const { engine, baseline, bytes } = file;
  assertEngine(ref, engine);
  if (engine.document.saveToString() !== baseline) {
    throw new Error("The document changed before opening the project. Please try again.");
  }
  try {
    const pending = engine.document.loadFromArchive(bytes);
    const installed = engine.document.saveToString();
    const info = await pending;
    assertEngine(ref, engine);
    if (engine.getRenderer()) engine.editor.fitToScreen(24);
    synchronizePageTools(engine);
    return { info, unchanged: engine.document.saveToString() === installed };
  } catch (error) {
    if (ref.current === engine && engine.document.saveToString() !== baseline) {
      synchronizePageTools(engine);
      useImageEditorStore.getState().markDirty();
    }
    throw error;
  }
}
