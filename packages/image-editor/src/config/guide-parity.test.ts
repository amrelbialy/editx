import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Test-as-docs parity guard.
 *
 * Every guide in `docs/guides/<slug>.md` MUST have a matching executable
 * specification at `tests/guides/<slug>.spec.tsx`, and vice versa. This keeps
 * the documentation honest: a documented scenario cannot drift from a passing
 * test, and a guide test cannot exist without docs.
 */

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "../..");
const guidesDir = resolve(packageRoot, "docs/guides");
const specsDir = resolve(packageRoot, "tests/guides");

function slugs(dir: string, suffix: string): string[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith(suffix))
    .map((file) => file.slice(0, -suffix.length))
    .sort();
}

describe("Guide docs <-> journey spec parity", () => {
  const guideSlugs = slugs(guidesDir, ".md");
  const specSlugs = slugs(specsDir, ".spec.tsx");

  it("ships at least one guide", () => {
    expect(guideSlugs.length).toBeGreaterThan(0);
  });

  it("every guide doc has a matching spec", () => {
    const missing = guideSlugs.filter((slug) => !specSlugs.includes(slug));
    expect(missing, `guides missing tests/guides/<slug>.spec.tsx: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("every guide spec has a matching doc", () => {
    const missing = specSlugs.filter((slug) => !guideSlugs.includes(slug));
    expect(missing, `specs missing docs/guides/<slug>.md: ${missing.join(", ")}`).toEqual([]);
  });
});
