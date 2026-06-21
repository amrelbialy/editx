import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Test-as-docs parity guard.
 *
 * Every recipe in `docs/recipes/<slug>.md` MUST have a matching executable
 * specification at `tests/recipes/<slug>.spec.tsx`, and vice versa. This keeps
 * the documentation honest: a documented scenario cannot drift from a passing
 * test, and a recipe test cannot exist without docs.
 */

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "../..");
const recipesDir = resolve(packageRoot, "docs/recipes");
const specsDir = resolve(packageRoot, "tests/recipes");

function slugs(dir: string, suffix: string): string[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith(suffix))
    .map((file) => file.slice(0, -suffix.length))
    .sort();
}

describe("Recipe docs <-> journey spec parity", () => {
  const recipeSlugs = slugs(recipesDir, ".md");
  const specSlugs = slugs(specsDir, ".spec.tsx");

  it("ships at least one recipe", () => {
    expect(recipeSlugs.length).toBeGreaterThan(0);
  });

  it("every recipe doc has a matching spec", () => {
    const missing = recipeSlugs.filter((slug) => !specSlugs.includes(slug));
    expect(missing, `recipes missing tests/recipes/<slug>.spec.tsx: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("every recipe spec has a matching doc", () => {
    const missing = specSlugs.filter((slug) => !recipeSlugs.includes(slug));
    expect(missing, `specs missing docs/recipes/<slug>.md: ${missing.join(", ")}`).toEqual([]);
  });
});
