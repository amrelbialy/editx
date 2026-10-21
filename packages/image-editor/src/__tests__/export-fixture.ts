import type { EditxEngine } from "@editx/engine";
import { type RenderHookResult, renderHook } from "@testing-library/react";
import { type Mock, type Mocked, type MockInstance, vi } from "vitest";
import { type UseExportOptions, useExport } from "../hooks/use-export";
import type { EditorNotifications } from "../hooks/use-notifications";
import { createNavigationEngine } from "./page-navigation-fixture";

interface ExportFixture extends RenderHookResult<ReturnType<typeof useExport>, unknown> {
  engine: EditxEngine;
  engineRef: UseExportOptions["engineRef"];
  cover: number;
  poster: number;
  card: number;
  scene: MockInstance<EditxEngine["exportScene"]>;
  page: MockInstance<EditxEngine["exportPage"]>;
  sceneBlob: Blob;
  onSave: Mock<NonNullable<UseExportOptions["onSave"]>>;
  notify: Mocked<EditorNotifications>;
}

export async function createExportFixture(
  options: Partial<UseExportOptions> = {},
): Promise<ExportFixture> {
  const { engine, cover, poster, card } = await createNavigationEngine();
  const sceneBlob = new Blob(["scene"], { type: "image/png" });
  const scene = vi.spyOn(engine, "exportScene").mockResolvedValue(sceneBlob);
  const page = vi
    .spyOn(engine, "exportPage")
    .mockResolvedValue(new Blob(["page"], { type: "image/png" }));
  const onSave = vi.fn<NonNullable<UseExportOptions["onSave"]>>();
  const notify = {
    success: vi.fn<EditorNotifications["success"]>(),
    error: vi.fn<EditorNotifications["error"]>(),
    info: vi.fn<EditorNotifications["info"]>(),
  };
  const engineRef: UseExportOptions["engineRef"] = { current: engine };
  const hook = renderHook(() => useExport({ engineRef, onSave, notify, ...options }));
  return {
    ...hook,
    engineRef,
    engine,
    cover,
    poster,
    card,
    scene,
    page,
    sceneBlob,
    onSave,
    notify,
  };
}
