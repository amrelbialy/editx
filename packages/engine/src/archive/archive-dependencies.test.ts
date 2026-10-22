import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { FILL_IMAGE_SRC, FONT_FAMILY, TEXT_RUNS } from "../block/property-keys";
import { EditxEngine } from "../editx-engine";
import { createEditxArchive, readEditxArchive } from "./index";

async function dependencyDocument(): Promise<string> {
  const engine = new EditxEngine();
  await engine.scene.create();
  const page = engine.getActivePage()!;
  engine.block.addImage(page, "data:image/png;base64,same", 0, 0, 10, 10, 10, 10);
  engine.block.addImage(page, "data:image/png;base64,same", 10, 0, 10, 10, 10, 10);
  engine.block.addImage(page, "https://example.com/image.png", 20, 0, 10, 10, 10, 10);
  engine.block.addImage(page, "blob:https://example.com/id", 30, 0, 10, 10, 10, 10);
  const graphic = engine.block.addShape(page, "rect", "color", 0, 20, 10, 10);
  engine.block.setFill(graphic, engine.block.createFill("image"));
  engine.block.setProperty(engine.block.getFill(graphic)!, FILL_IMAGE_SRC, "images/local.png");

  const text = engine.block.addText(page, 0, 40, 100, 20, "Fonts");
  engine.block.setProperty(text, FONT_FAMILY, "Legacy");
  engine.block.setProperty(text, TEXT_RUNS, [
    { text: "A", style: { fontFamily: "Inter" } },
    { text: "B", style: {} },
  ]);
  return engine.document.saveToString();
}

describe("archive dependency reports", () => {
  it("coalesces image references without copying inline payloads", async () => {
    const result = readEditxArchive(
      createEditxArchive({ documentJson: await dependencyDocument() }),
    );
    const inline = result.assets.dependencies.find(
      (dependency) => dependency.classification === "inline-data",
    )!;
    expect(inline).not.toHaveProperty("source");
    expect(inline.locations).toHaveLength(2);
    expect(result.assets.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ classification: "unresolved" }),
        expect.objectContaining({
          classification: "external-url",
          source: "https://example.com/image.png",
        }),
        expect.objectContaining({
          classification: "blob-url",
          source: "blob:https://example.com/id",
        }),
        expect.objectContaining({
          classification: "relative-or-opaque",
          source: "images/local.png",
        }),
      ]),
    );
    expect(JSON.stringify(result.assets)).not.toContain("base64,same");
  });

  it("reports explicit, run-level, and implicit fallback fonts as unresolved", async () => {
    const { fonts } = readEditxArchive(
      createEditxArchive({ documentJson: await dependencyDocument() }),
    );
    expect(fonts.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ family: "Legacy", implicit: false, resolution: "unresolved" }),
        expect.objectContaining({ family: "Inter", implicit: false, resolution: "unresolved" }),
        expect.objectContaining({ family: "Legacy", implicit: true, resolution: "unresolved" }),
      ]),
    );
    const implicit = fonts.dependencies.find(
      (dependency) => dependency.family === "Legacy" && dependency.implicit,
    )!;
    expect(implicit.locations).toEqual([
      expect.objectContaining({
        property: "text/runs.style.fontFamily",
        runIndex: 1,
      }),
    ]);
  });

  it("rejects a dependency report that disagrees with the document inventory", async () => {
    const archive = createEditxArchive({ documentJson: await dependencyDocument() });
    const entries = unzipSync(archive);
    const assets = JSON.parse(new TextDecoder().decode(entries["assets/manifest.json"])) as {
      dependencies: unknown[];
    };
    assets.dependencies = [];
    entries["assets/manifest.json"] = new TextEncoder().encode(JSON.stringify(assets));
    const tampered = zipSync(entries, {
      mtime: new Date(1980, 0, 1),
      attrs: 0,
      os: 0,
    });

    expect(() => readEditxArchive(tampered)).toThrowError(
      expect.objectContaining({ code: "INVALID_MANIFEST" }),
    );
  });
});
