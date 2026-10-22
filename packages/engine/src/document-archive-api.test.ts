import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine, PageExportError, type RendererAdapter } from "./index";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

describe("DocumentAPI archives and previews", () => {
  it("saves and loads through validated document replacement semantics", async () => {
    const source = new EditxEngine();
    await source.scene.create();
    source.block.setName(source.getActivePage()!, "Archived");
    const archive = source.document.saveToArchive({ preview: png });

    const target = new EditxEngine();
    await target.scene.create();
    target.block.setName(target.getActivePage()!, "Undoable");
    expect(target.canUndo()).toBe(true);
    const info = await target.document.loadFromArchive(archive);

    expect(target.document.saveToString()).toBe(source.document.saveToString());
    expect(target.canUndo()).toBe(false);
    expect(info.manifest.members.preview).toBe("previews/preview.png");
  });

  it("validates an archive completely before mutating the live document", async () => {
    const engine = new EditxEngine();
    await engine.scene.create();
    engine.block.setName(engine.getActivePage()!, "Keep history");
    const before = engine.document.saveToString();
    const bad = engine.document.saveToArchive().slice();
    bad[35] ^= 1;

    await expect(engine.document.loadFromArchive(bad)).rejects.toBeDefined();
    expect(engine.document.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(true);
  });

  it("renders the first authored-root page, not the active scene", async () => {
    const renderer = createMockRenderer();
    renderer.exportDocumentPreview = vi
      .fn()
      .mockResolvedValue(new Blob([png], { type: "image/png" }));
    const engine = new EditxEngine({ renderer });
    await engine.scene.create({ width: 100, height: 80 });
    const activeScene = engine.getActiveScene()!;
    const activePage = engine.getActivePage()!;
    await engine.scene.create({ width: 1000, height: 250 });
    const authoredPage = engine.getActivePage()!;
    engine.scene.addPage({ width: 50, height: 50 });
    engine.setActiveScene(activeScene);
    engine.setActivePage(activePage);

    await expect(engine.document.exportPreview()).resolves.toMatchObject({ type: "image/png" });
    expect(renderer.exportDocumentPreview).toHaveBeenCalledWith(authoredPage, {
      format: "png",
      quality: 0.92,
      pixelRatio: 0.512,
    });
    expect(engine.getActiveScene()).toBe(activeScene);
    expect(engine.getActivePage()).toBe(activePage);
  });

  it("returns null for empty, headless, and incapable renderer documents", async () => {
    await expect(new EditxEngine().document.exportPreview()).resolves.toBeNull();
    const headless = new EditxEngine();
    await headless.scene.create();
    await expect(headless.document.exportPreview()).resolves.toBeNull();

    const renderer = createMockRenderer();
    const incapable = { ...renderer, exportDocumentPreview: undefined } as RendererAdapter;
    const engine = new EditxEngine({ renderer: incapable });
    await engine.scene.create();
    await expect(engine.document.exportPreview()).resolves.toBeNull();
  });

  it("uses PageExportError for rendering and non-PNG failures", async () => {
    const renderer = createMockRenderer();
    renderer.exportDocumentPreview = vi
      .fn()
      .mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
    const engine = new EditxEngine({ renderer });
    await engine.scene.create();
    await expect(engine.document.exportPreview()).rejects.toBeInstanceOf(PageExportError);

    const error = new PageExportError("IMAGE_LOAD_FAILED", engine.getActivePage()!, "missing");
    vi.mocked(renderer.exportDocumentPreview).mockRejectedValue(error);
    await expect(engine.document.exportPreview()).rejects.toBe(error);
  });
});
