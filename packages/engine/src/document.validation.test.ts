import { describe, expect, it } from "vitest";
import { documentFixture } from "./__tests__/document-validation-fixture";
import { DocumentValidationError } from "./document-validation-error";
import { EditxEngine } from "./editx-engine";

type Fixture = Awaited<ReturnType<typeof documentFixture>>;
type InvalidCase = {
  label: string;
  change: (fixture: Fixture) => void;
  code: string;
  path: readonly (string | number)[];
};

const invalid: InvalidCase[] = [
  {
    label: "kind",
    change: ({ document }) => {
      document.kind = "foreign";
    },
    code: "UNSUPPORTED_KIND",
    path: ["kind"],
  },
  {
    label: "version",
    change: ({ document }) => {
      document.schemaVersion = 999;
    },
    code: "UNSUPPORTED_VERSION",
    path: ["schemaVersion"],
  },
  {
    label: "missing id",
    change: ({ document }) => {
      Reflect.deleteProperty(document, "id");
    },
    code: "MISSING_FIELD",
    path: ["id"],
  },
  {
    label: "empty id",
    change: ({ document }) => {
      document.id = "";
    },
    code: "INVALID_FIELD",
    path: ["id"],
  },
  {
    label: "metadata",
    change: ({ document }) => {
      Reflect.set(document, "metadata", []);
    },
    code: "INVALID_FIELD",
    path: ["metadata"],
  },
  {
    label: "missing blocks",
    change: ({ document }) => {
      Reflect.deleteProperty(document.scene, "blocks");
    },
    code: "MISSING_FIELD",
    path: ["scene", "blocks"],
  },
  {
    label: "root",
    change: ({ document }) => {
      document.scene.rootSceneId = 999;
    },
    code: "MISSING_BLOCK_REFERENCE",
    path: ["scene", "rootSceneId"],
  },
  {
    label: "root type",
    change: ({ document, ids }) => {
      document.scene.rootSceneId = ids.page;
    },
    code: "INVALID_BLOCK_TYPE",
    path: ["scene", "rootSceneId"],
  },
  {
    label: "block object",
    change: ({ document }) => {
      Reflect.set(document.scene.blocks, 0, null);
    },
    code: "INVALID_FIELD",
    path: ["scene", "blocks", 0],
  },
  {
    label: "block type",
    change: ({ document }) => {
      Reflect.set(document.scene.blocks[0], "type", "unknown");
    },
    code: "INVALID_BLOCK_TYPE",
    path: ["scene", "blocks", 0, "type"],
  },
  {
    label: "duplicate id",
    change: ({ document }) => {
      document.scene.blocks.push(document.scene.blocks[0]);
    },
    code: "DUPLICATE_BLOCK_ID",
    path: ["scene", "blocks", 0, "id"],
  },
  {
    label: "fractional id",
    change: ({ document }) => {
      document.scene.blocks[0].id = 0.5;
    },
    code: "INVALID_FIELD",
    path: ["scene", "blocks", 0, "id"],
  },
  {
    label: "negative id",
    change: ({ document }) => {
      document.scene.blocks[0].id = -1;
    },
    code: "INVALID_FIELD",
    path: ["scene", "blocks", 0, "id"],
  },
  {
    label: "exhausted id",
    change: ({ document }) => {
      document.scene.blocks[0].id = Number.MAX_SAFE_INTEGER;
    },
    code: "INVALID_FIELD",
    path: ["scene", "blocks", 0, "id"],
  },
  {
    label: "invalid reference id",
    change: ({ document }) => {
      Reflect.set(document.scene.blocks[0].children, 0, "2");
    },
    code: "INVALID_FIELD",
    path: ["scene", "blocks", 0, "children", 0],
  },
];

describe("document schema validation", () => {
  it.each(invalid)("reports $label with a structured path", async ({ change, code, path }) => {
    const fixture = await documentFixture();
    change(fixture);
    const target = new EditxEngine();
    await expect(
      target.document.loadFromString(JSON.stringify(fixture.document)),
    ).rejects.toMatchObject({
      name: "DocumentValidationError",
      issues: expect.arrayContaining([expect.objectContaining({ code, path })]),
    });
  });

  it.each([
    "id",
    "type",
    "kind",
    "name",
    "parentId",
    "children",
    "effectIds",
    "shapeId",
    "fillId",
    "properties",
  ])("requires core block field %s", async (field) => {
    const { document } = await documentFixture();
    Reflect.deleteProperty(document.scene.blocks[0], field);
    await expect(
      new EditxEngine().document.loadFromString(JSON.stringify(document)),
    ).rejects.toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_FIELD",
          path: ["scene", "blocks", 0, field],
        }),
      ]),
    });
  });

  it.each(["null", "[]", "42", '"scene"', "{}"])("rejects non-document JSON %s", async (json) => {
    await expect(new EditxEngine().document.loadFromString(json)).rejects.toBeInstanceOf(
      DocumentValidationError,
    );
  });

  it("never falls back from an unknown envelope to a valid legacy version", async () => {
    const { engine } = await documentFixture();
    const payload = { ...JSON.parse(engine.scene.saveToString()), kind: "unknown" };
    await expect(engine.document.loadFromString(JSON.stringify(payload))).rejects.toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "UNSUPPORTED_KIND", path: ["kind"] }),
      ]),
    });
  });

  it("collects independent field errors and identifies source blocks", async () => {
    const { document, ids } = await documentFixture();
    Reflect.set(document.scene.blocks[0], "name", 12);
    document.scene.blocks[1].properties["page/width"] = "wrong";
    await expect(
      new EditxEngine().document.loadFromString(JSON.stringify(document)),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({ blockId: ids.scene, path: ["scene", "blocks", 0, "name"] }),
        expect.objectContaining({
          blockId: ids.page,
          path: ["scene", "blocks", 1, "properties", "page/width"],
        }),
      ],
    });
  });

  it("does not identify invalid or duplicate IDs as unambiguous source blocks", async () => {
    const { document } = await documentFixture();
    document.scene.blocks.push(document.scene.blocks[0]);
    const error = await new EditxEngine().document
      .loadFromString(JSON.stringify(document))
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(DocumentValidationError);
    if (!(error instanceof DocumentValidationError)) throw new Error("Expected validation issues");
    for (const issue of error.issues) expect(issue).not.toHaveProperty("blockId");
  });

  it("returns defensive, frozen structured issues", () => {
    const path: (string | number)[] = ["scene", "blocks", 0];
    const issue = { code: "INVALID_FIELD" as const, path, message: "Invalid block" };
    const error = new DocumentValidationError([issue]);
    path.push("modified");
    issue.message = "changed";
    expect(error.message).toContain("Invalid block");
    expect(error.issues[0]).toEqual({
      code: "INVALID_FIELD",
      path: ["scene", "blocks", 0],
      message: "Invalid block",
    });
    expect(Object.isFrozen(error.issues)).toBe(true);
    expect(Object.isFrozen(error.issues[0])).toBe(true);
    expect(Object.isFrozen(error.issues[0].path)).toBe(true);
    expect(() => new DocumentValidationError([])).toThrow(TypeError);
  });
});
