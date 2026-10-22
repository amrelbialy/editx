import { describe, expect, it } from "vitest";
import { documentFixture } from "./__tests__/document-validation-fixture";
import { DocumentValidationError } from "./document-validation-error";
import { EditxEngine } from "./editx-engine";

describe("document property validation", () => {
  it.each([
    ["transform/position/x", "wrong"],
    ["appearance/visible", 1],
    ["image/src", {}],
    ["fill/color", null],
    ["fill/color", { r: 0, g: 0, b: "bad", a: 1 }],
    ["fill/gradient/stops", [{ offset: "bad", color: "#fff" }]],
    ["stroke/gradient/stops", [{ offset: 0 }], "MISSING_FIELD"],
    ["page/metadata", { title: 2 }],
    ["text/runs", [null]],
    ["text/runs", [{ text: 12, style: {} }]],
    ["text/runs", [{ text: "x" }], "MISSING_FIELD"],
    ["text/runs", [{ text: "x", style: { fontSize: "big" } }]],
    ["text/runs", [{ text: "x", style: { fill: 2 } }]],
    ["text/runs", [{ text: "x", style: { fillGradient: { type: "radial", stops: [null] } } }]],
    [
      "text/runs",
      [{ text: "x", style: { textStrokeGradient: { type: "radial", angle: 0, stops: [] } } }],
    ],
    ["text/runs", [{ text: "x", style: { backgroundPadding: { top: "bad" } } }]],
    ["text/runs", [{ text: "x", style: { textTransform: "invalid" } }]],
    ["text/runs", [{ text: "x", style: { textTransform: { toString: null } } }]],
    ["plugin/value", null],
    ["plugin/value", { nested: { value: true } }],
    [
      "plugin/value",
      [
        { offset: 0, color: "#fff" },
        { text: "mixed", style: {} },
      ],
      "MISSING_FIELD",
    ],
  ])("rejects invalid %s property shape", async (key, value, code = "INVALID_FIELD") => {
    const { document, block, ids } = await documentFixture();
    Reflect.set(block(ids.graphic).properties, String(key), value);
    await expect(
      new EditxEngine().document.loadFromString(JSON.stringify(document)),
    ).rejects.toMatchObject({
      issues: expect.arrayContaining([expect.objectContaining({ code, blockId: ids.graphic })]),
    });
  });

  it("reports nested text property paths", async () => {
    const { document, block, ids } = await documentFixture();
    const index = document.scene.blocks.findIndex((item) => item.id === ids.text);
    Reflect.set(block(ids.text).properties, "text/runs", [
      {
        text: "x",
        style: {
          fillGradient: {
            type: "linear",
            stops: [{ offset: 0, color: 123 }],
          },
        },
      },
    ]);
    await expect(
      new EditxEngine().document.loadFromString(JSON.stringify(document)),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          path: [
            "scene",
            "blocks",
            index,
            "properties",
            "text/runs",
            0,
            "style",
            "fillGradient",
            "stops",
            0,
            "color",
          ],
        }),
      ],
    });
  });

  it.each([
    "fillGradient",
    "textStrokeGradient",
  ])("reports missing %s stops with the required-field code and path", async (key) => {
    const { document, block, ids } = await documentFixture();
    const index = document.scene.blocks.findIndex((item) => item.id === ids.text);
    Reflect.set(block(ids.text).properties, "text/runs", [
      { text: "x", style: { [key]: { type: "linear", angle: 0 } } },
    ]);
    await expect(
      new EditxEngine().document.loadFromString(JSON.stringify(document)),
    ).rejects.toMatchObject({
      issues: [
        {
          code: "MISSING_FIELD",
          blockId: ids.text,
          path: ["scene", "blocks", index, "properties", "text/runs", 0, "style", key, "stops"],
          message: expect.any(String),
        },
      ],
    });
  });

  it("rejects non-finite parsed property and metadata numbers", async () => {
    const { engine } = await documentFixture();
    const json = engine.document.saveToString();
    for (const invalid of [
      json.replace('"transform/rotation":0', '"transform/rotation":1e400'),
      json.replace('"metadata":{}', '"metadata":{"score":1e400}'),
    ]) {
      await expect(engine.document.loadFromString(invalid)).rejects.toBeInstanceOf(
        DocumentValidationError,
      );
    }
  });

  it("validates deeply nested malformed metadata without recursive stack failure", async () => {
    const { engine } = await documentFixture();
    const deep = `${'{"nested":'.repeat(2000)}1e400${"}".repeat(2000)}`;
    const json = engine.document.saveToString().replace('"metadata":{}', `"metadata":${deep}`);
    await expect(engine.document.loadFromString(json)).rejects.toMatchObject({
      name: "DocumentValidationError",
      issues: [expect.objectContaining({ code: "INVALID_FIELD" })],
    });
  });

  it("retains all supported extension value shapes and JSON metadata", async () => {
    const { document, block, ids } = await documentFixture();
    Object.assign(block(ids.graphic).properties, {
      "plugin/number": 2,
      "plugin/string": "value",
      "plugin/bool": false,
      "plugin/color": { r: 1, g: 0, b: 0, a: 1 },
      "plugin/map": { source: "host" },
      "plugin/stops": [{ offset: 0, color: "#fff" }],
      "plugin/runs": [{ text: "custom", style: { fontSize: 16 } }],
    });
    document.metadata = { nested: [1, "value", false, null, { more: true }] };
    const json = JSON.stringify(document);
    const target = new EditxEngine();
    await target.document.loadFromString(json);
    expect(target.document.saveToString()).toBe(json);
  });

  it("preserves prototype-named JSON metadata and extension keys as data", async () => {
    const { document, block, ids } = await documentFixture();
    document.metadata = JSON.parse('{"__proto__":{"safe":true},"constructor":"host"}');
    block(ids.graphic).properties = {
      ...block(ids.graphic).properties,
      ...JSON.parse('{"__proto__":{"safe":"yes"},"constructor":"custom"}'),
    };
    const json = JSON.stringify(document);
    const target = new EditxEngine();
    await target.document.loadFromString(json);
    expect(target.document.saveToString()).toBe(json);
    expect(Object.getPrototypeOf(target.document.getMetadata())).toBe(Object.prototype);
  });
});
