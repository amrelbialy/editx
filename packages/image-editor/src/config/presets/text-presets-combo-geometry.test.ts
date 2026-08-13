import { describe, expect, it } from "vitest";
import { combinations } from "./text-presets-combos";
import { boxedCombos } from "./text-presets-combos-boxed";
import { brandCombos } from "./text-presets-combos-brand";
import { campaignCombos } from "./text-presets-combos-campaign";
import { editorialCombos } from "./text-presets-combos-editorial";
import { promoCombos } from "./text-presets-combos-promo";

const presets = [
  ...editorialCombos,
  ...promoCombos,
  ...boxedCombos,
  ...brandCombos,
  ...campaignCombos,
];
const byId = new Map(presets.map((preset) => [preset.id, preset]));
const tunedIds = [
  "quote",
  "sale-badge",
  "title-tag",
  "event-details",
  "price-stack",
  "promo-code",
  "breaking-news",
  "cinematic",
] as const;
const featured = combinations.slice(0, 5);

describe("text combination authored geometry", () => {
  it("adds ten distinct professional combinations", () => {
    const added = [...brandCombos, ...campaignCombos];
    expect(added).toHaveLength(10);
    expect(new Set(added.map((preset) => preset.id)).size).toBe(10);
    expect(combinations).toHaveLength(23);
    for (const preset of added) {
      expect(
        Math.max(...preset.blocks.map((block) => block.fontSizeScale ?? 1)),
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("features the refreshed presets first with stable IDs and labels", () => {
    expect(featured.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "text-box", label: "Box" },
      { id: "postcard", label: "Greetings" },
      { id: "promo-code", label: "Promo" },
      { id: "thanks-plus", label: "Thanks Plus" },
      { id: "quote", label: "Speech" },
    ]);
  });

  it("authors every featured preset for readable thumbnails and normalized insertion", () => {
    for (const preset of featured) {
      expect(
        Math.max(...preset.blocks.map((block) => block.fontSizeScale ?? 1)),
      ).toBeGreaterThanOrEqual(2);
      for (const element of preset.composition?.elements ?? []) {
        expect(element.layout.x).toBeGreaterThanOrEqual(0);
        expect(element.layout.y).toBeGreaterThanOrEqual(0);
        expect(element.layout.x + element.layout.width).toBeLessThanOrEqual(1);
        expect(element.layout.y + element.layout.height).toBeLessThanOrEqual(1);
      }
    }
  });

  it("gives Promo a prominent green headline inside a visible box", () => {
    const promo = featured.find(({ id }) => id === "promo-code");
    const headline = promo?.blocks.find((block) => block.backgroundBox);
    expect(headline?.fontSizeScale).toBeGreaterThanOrEqual(3);
    expect(headline?.fill).toBe("#15803d");
    expect(headline?.backgroundBox).toMatchObject({
      color: "#ffffff",
      stroke: { color: "#166534", width: 3 },
    });
  });

  it("preserves the tuned preset IDs", () => {
    expect([...byId.keys()]).toEqual(
      expect.arrayContaining([
        "heading-subtitle",
        "title-tag",
        "cinematic",
        "quote",
        "name-role",
        "sale-badge",
        "postcard",
        "thanks-plus",
        "event-details",
        "price-stack",
        "promo-code",
        "text-box",
        "breaking-news",
      ]),
    );
  });

  it("keeps the thank-you headline finite and fitted on one authored row", () => {
    const heading = byId.get("heading-subtitle")?.composition?.elements[0];
    expect(heading?.kind).toBe("text");
    if (heading?.kind !== "text") {
      throw new Error("expected heading text");
    }
    expect(heading.widthMode).toBe("auto");
    expect(heading.layout.width).toBeGreaterThan(0);
    expect(heading.layout.x + heading.layout.width).toBeLessThanOrEqual(1);
    expect(heading.layout.height).toBeLessThan(0.1);
    expect(Number.isFinite(heading.layout.width / heading.layout.height)).toBe(true);
  });

  it("uses one box for Box and individual labels for the stacked statement", () => {
    const box = byId.get("text-box");
    const stack = byId.get("title-tag");
    expect(box?.blocks).toHaveLength(1);
    expect(box?.blocks[0].backgroundBox?.color).toBe("#c7d2fe");
    expect(stack?.label).toBe("Stacked Labels");
    expect(stack?.blocks.map((block) => block.text)).toEqual(["Keep", "It", "Real"]);
    expect(stack?.blocks.every((block) => block.backgroundBox?.color === "#ffffff")).toBe(true);
  });

  it("rotates Thank You and gives Studio and Edition Mark layered cards", () => {
    const thankYou = byId.get("heading-subtitle");
    const studio = byId.get("name-role");
    const edition = byId.get("price-stack");
    expect(thankYou?.composition?.elements.every((element) => element.layout.rotation === -3)).toBe(
      true,
    );
    for (const preset of [studio, edition]) {
      const shapes = preset?.composition?.elements.filter((element) => element.kind === "shape");
      expect(shapes).toHaveLength(2);
      expect(shapes?.every((element) => element.shape.kind === "rect")).toBe(true);
      expect(shapes?.[0].opacity).toBeLessThan(1);
    }
  });

  it("uses a wide quote path and keeps its text stack inside the bubble", () => {
    const quote = byId.get("quote");
    const [bubble, body, attribution] = quote?.composition?.elements ?? [];
    expect(bubble?.kind).toBe("shape");
    if (bubble?.kind !== "shape" || bubble.shape.kind !== "path") {
      throw new Error("expected quote path");
    }
    expect(bubble.shape.viewBox?.width).toBeGreaterThan((bubble.shape.viewBox?.height ?? 0) * 2);
    expect(bubble.layout.width).toBeGreaterThan(bubble.layout.height * 2);
    expect(body.layout.y).toBeGreaterThan(bubble.layout.y);
    expect(attribution.kind === "text" ? attribution.block : undefined).toBe(1);
    expect(attribution.layout.y + attribution.layout.height).toBeLessThan(
      bubble.layout.y + bubble.layout.height * 0.8,
    );
  });

  it("keeps Speech and Studio backplates tight around their text", () => {
    const speech = byId.get("quote");
    const studio = byId.get("name-role");
    const speechShape = speech?.composition?.elements[0];
    const studioCard = studio?.composition?.elements[1];
    expect(speechShape?.layout.width).toBeLessThanOrEqual(0.62);
    expect(speech?.blocks[0].fontSizeScale).toBeGreaterThanOrEqual(2.5);
    expect(studioCard?.kind).toBe("shape");
    expect(studioCard?.layout.width).toBeLessThanOrEqual(0.56);
    expect(studio?.blocks[0].fontSizeScale).toBeGreaterThanOrEqual(3.2);
  });

  it("keeps the reduced sale stack within the badge and below former dominance", () => {
    const sale = byId.get("sale-badge");
    const [badge, ...text] = sale?.composition?.elements ?? [];
    expect(badge?.kind).toBe("shape");
    expect(sale?.blocks[0].fontSizeScale).toBeLessThan(4);
    expect(badge.layout.width).toBeLessThanOrEqual(0.4);
    expect(text).toHaveLength(3);
    expect(sale?.blocks[2].fill).toBe("#ffffff");
    expect(Math.min(...text.map((element) => element.layout.y))).toBeGreaterThan(badge.layout.y);
    expect(
      Math.max(...text.map((element) => element.layout.y + element.layout.height)),
    ).toBeLessThan(badge.layout.y + badge.layout.height);
  });

  it("keeps short labels auto-width and explicit multiline blocks fixed-width", () => {
    const title = byId.get("title-tag")?.composition?.elements[0];
    const quoteBody = byId.get("quote")?.composition?.elements[1];
    expect(title?.kind === "text" ? title.widthMode : undefined).toBe("auto");
    expect(quoteBody?.kind === "text" ? quoteBody.widthMode : undefined).toBe("fixed");
  });

  it.each(tunedIds)("keeps tuned %s text rows coherent and on-canvas", (id) => {
    const text =
      byId.get(id)?.composition?.elements.filter((element) => element.kind === "text") ?? [];
    expect(text.length).toBeGreaterThan(1);

    for (const [index, element] of text.entries()) {
      expect(element.layout.x).toBeGreaterThanOrEqual(0);
      expect(element.layout.y).toBeGreaterThanOrEqual(0);
      expect(element.layout.x + element.layout.width).toBeLessThanOrEqual(1);
      expect(element.layout.y + element.layout.height).toBeLessThanOrEqual(1);
      if (index > 0) {
        const previous = text[index - 1];
        expect(element.layout.y).toBeGreaterThanOrEqual(previous.layout.y + previous.layout.height);
      }
    }
  });
});
