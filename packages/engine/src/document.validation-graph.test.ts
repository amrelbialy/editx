import { describe, expect, it } from "vitest";
import { documentFixture } from "./__tests__/document-validation-fixture";
import { EditxEngine } from "./editx-engine";

type Fixture = Awaited<ReturnType<typeof documentFixture>>;
const cases: { label: string; change: (fixture: Fixture) => void; code: string }[] = [
  {
    label: "parent reference",
    change: ({ block, ids }) => {
      block(ids.graphic).parentId = 999;
    },
    code: "MISSING_BLOCK_REFERENCE",
  },
  {
    label: "child reference",
    change: ({ block, ids }) => {
      block(ids.page).children.push(999);
    },
    code: "MISSING_BLOCK_REFERENCE",
  },
  {
    label: "shape reference",
    change: ({ block, ids }) => {
      block(ids.graphic).shapeId = 999;
    },
    code: "MISSING_BLOCK_REFERENCE",
  },
  {
    label: "fill reference",
    change: ({ block, ids }) => {
      block(ids.graphic).fillId = 999;
    },
    code: "MISSING_BLOCK_REFERENCE",
  },
  {
    label: "effect reference",
    change: ({ block, ids }) => {
      block(ids.graphic).effectIds.push(999);
    },
    code: "MISSING_BLOCK_REFERENCE",
  },
  {
    label: "shape type",
    change: ({ block, ids }) => {
      block(ids.graphic).shapeId = ids.fill;
    },
    code: "INVALID_BLOCK_TYPE",
  },
  {
    label: "fill type",
    change: ({ block, ids }) => {
      block(ids.graphic).fillId = ids.shape;
    },
    code: "INVALID_BLOCK_TYPE",
  },
  {
    label: "effect type",
    change: ({ block, ids }) => {
      block(ids.graphic).effectIds = [ids.text];
    },
    code: "INVALID_BLOCK_TYPE",
  },
  {
    label: "duplicate children",
    change: ({ block, ids }) => {
      block(ids.page).children.push(ids.graphic);
    },
    code: "INVALID_BLOCK_OWNERSHIP",
  },
  {
    label: "duplicate effects",
    change: ({ block, ids }) => {
      block(ids.graphic).effectIds.push(ids.effect);
    },
    code: "INVALID_BLOCK_OWNERSHIP",
  },
  {
    label: "missing child backlink",
    change: ({ block, ids }) => {
      block(ids.graphic).parentId = null;
    },
    code: "INVALID_BLOCK_OWNERSHIP",
  },
  {
    label: "missing parent backlink",
    change: ({ block, ids }) => {
      block(ids.page).children = [];
    },
    code: "INVALID_BLOCK_OWNERSHIP",
  },
  {
    label: "multiple parents",
    change: ({ block, ids }) => {
      block(ids.scene).children.push(ids.graphic);
    },
    code: "INVALID_BLOCK_OWNERSHIP",
  },
  {
    label: "page under page",
    change: ({ block, ids }) => {
      block(ids.scene).children = [];
      block(ids.page).parentId = ids.graphic;
      block(ids.graphic).children = [ids.page];
    },
    code: "INVALID_BLOCK_OWNERSHIP",
  },
  {
    label: "attached resource",
    change: ({ block, ids }) => {
      block(ids.fill).parentId = ids.graphic;
      block(ids.graphic).children = [ids.fill];
    },
    code: "INVALID_BLOCK_OWNERSHIP",
  },
  {
    label: "unsupported fill owner",
    change: ({ block, ids }) => {
      block(ids.text).fillId = ids.fill;
    },
    code: "INVALID_BLOCK_OWNERSHIP",
  },
  {
    label: "unsupported effect owner",
    change: ({ block, ids }) => {
      block(ids.shape).effectIds = [ids.effect];
    },
    code: "INVALID_BLOCK_OWNERSHIP",
  },
  {
    label: "combined resource cycle",
    change: ({ block, ids }) => {
      block(ids.fill).children.push(ids.graphic);
    },
    code: "CYCLIC_BLOCK_GRAPH",
  },
];

describe("document graph validation", () => {
  it.each(cases)("rejects $label", async ({ change, code }) => {
    const fixture = await documentFixture();
    change(fixture);
    await expect(
      new EditxEngine().document.loadFromString(JSON.stringify(fixture.document)),
    ).rejects.toMatchObject({
      issues: expect.arrayContaining([expect.objectContaining({ code })]),
    });
  });

  it("detects cycles in detached components without recursive traversal", async () => {
    const { document } = await documentFixture();
    const template = document.scene.blocks[0];
    const count = 8000;
    const base = 100;
    for (let index = 0; index < count; index++) {
      document.scene.blocks.push({
        ...template,
        id: base + index,
        type: "group",
        properties: {},
        parentId: base + ((index + count - 1) % count),
        children: [base + ((index + 1) % count)],
      });
    }
    await expect(
      new EditxEngine().document.loadFromString(JSON.stringify(document)),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ code: "CYCLIC_BLOCK_GRAPH" })],
    });
  });

  it("loads detached content, multiple scenes, and shared acyclic resources", async () => {
    const { engine, ids } = await documentFixture();
    const secondPage = engine.scene.addPage();
    const other = engine.block.addShape(secondPage, "ellipse", "color", 0, 0, 50, 50);
    engine.block.setFill(other, ids.fill);
    engine.block.setShape(other, ids.shape);
    engine.block.appendEffect(other, ids.effect);
    engine.block.create("graphic");
    engine.block.createShape("rect");
    engine.block.createFill("color");
    engine.block.createEffect("filter");
    engine.block.create("page");
    await engine.scene.create();
    const json = engine.document.saveToString();
    const target = new EditxEngine();
    await target.document.loadFromString(json);
    expect(target.document.saveToString()).toBe(json);
  });

  it("accepts block ID zero and allocates safely after the maximum loaded ID", async () => {
    const { document, block, ids } = await documentFixture();
    block(ids.scene).id = 0;
    block(ids.page).parentId = 0;
    document.scene.rootSceneId = 0;
    const maxId = Math.max(...document.scene.blocks.map((item) => item.id));
    const target = new EditxEngine();
    await target.document.loadFromString(JSON.stringify(document));
    expect(target.document.getRootSceneId()).toBe(0);
    expect(target.block.create("text")).toBe(maxId + 1);
  });

  it.each([
    "document",
    "scene",
  ] as const)("preserves a valid maximum-ID %s load when subsequent creation exhausts IDs", async (loader) => {
    const { document, block, ids } = await documentFixture();
    block(ids.text).id = Number.MAX_SAFE_INTEGER - 1;
    block(ids.page).children = block(ids.page).children.map((id) =>
      id === ids.text ? Number.MAX_SAFE_INTEGER - 1 : id,
    );
    const incoming =
      loader === "document"
        ? document
        : {
            version: 2,
            blocks: document.scene.blocks,
            activeSceneId: ids.scene,
            activePageId: ids.page,
          };
    const target = new EditxEngine();
    await target[loader].loadFromString(JSON.stringify(incoming));
    const before = target.document.saveToString();
    expect(() => target.block.create("graphic")).toThrow(RangeError);
    expect(target.document.saveToString()).toBe(before);
  });
});
