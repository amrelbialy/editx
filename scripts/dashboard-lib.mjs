// @ts-nocheck — internal Node build script (not part of the typed project)
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Recursively collect files under `dir` whose name matches `test`.
 * @param {string} dir
 * @param {(name: string) => boolean} test
 * @param {string[]} [acc]
 * @returns {string[]}
 */
export function walk(dir, test, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".cache") continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, test, acc);
    else if (test(name)) acc.push(full);
  }
  return acc;
}

/**
 * Read a status map (filename stem -> status), tolerating a missing file.
 * @param {string} featuresDir
 * @returns {Record<string, string>}
 */
export function readStatusMap(featuresDir) {
  const file = join(featuresDir, "_status.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Read the feature tree JSON, tolerating a missing file.
 * @param {string} docsDir
 * @returns {object | null}
 */
export function readFeatureTree(docsDir) {
  const file = join(docsDir, "feature-tree.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Parse the hand-written Now / Next / Later checklists out of DASHBOARD.md.
 * Returns { now, next, later }, each an array of { done, text }.
 * @param {string} mdPath
 * @returns {{ now: object[], next: object[], later: object[] } | null}
 */
export function readFocus(mdPath) {
  if (!existsSync(mdPath)) return null;
  const buckets = { now: [], next: [], later: [] };
  let key = null;
  for (const raw of readFileSync(mdPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      key = /now/i.test(line)
        ? "now"
        : /next/i.test(line)
          ? "next"
          : /later/i.test(line)
            ? "later"
            : null;
      continue;
    }
    const m = line.match(/^- \[( |x)\]\s+(.*)$/i);
    if (key && m) buckets[key].push({ done: m[1].toLowerCase() === "x", text: m[2] });
  }
  return buckets;
}

/**
 * Parse the feature docs into { num, stem, title, status }.
 * @param {string} featuresDir
 */
export function readFeatures(featuresDir) {
  const statusMap = readStatusMap(featuresDir);
  if (!existsSync(featuresDir)) return [];
  return readdirSync(featuresDir)
    .filter((n) => n.endsWith(".md"))
    .map((name) => {
      const stem = name.replace(/\.md$/, "");
      const body = readFileSync(join(featuresDir, name), "utf8");
      const heading = body.split(/\r?\n/).find((l) => /^#\s+\S/.test(l)) ?? stem;
      const title = heading.replace(/^#\s+/, "").trim();
      const numMatch = stem.match(/^(\d+)/);
      return {
        stem,
        num: numMatch ? Number(numMatch[1]) : 999,
        title,
        status: statusMap[stem] ?? "planned",
      };
    })
    .sort((a, b) => a.num - b.num || a.stem.localeCompare(b.stem));
}

/**
 * Run a git command, returning "" on failure (e.g. no repo).
 * @param {string} args
 * @param {string} root
 * @returns {string}
 */
export function git(args, root) {
  try {
    return execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/**
 * Gather repo + test/recipe metrics.
 * @param {string} root
 */
export function collectMetrics(root) {
  const ieRoot = join(root, "packages", "image-editor");
  const engineRoot = join(root, "packages", "engine");

  const recipeDocs = walk(join(ieRoot, "docs", "recipes"), (n) => n.endsWith(".md"));
  const recipeSpecs = walk(join(ieRoot, "tests", "recipes"), (n) => n.endsWith(".spec.tsx"));
  const ieTests = walk(join(ieRoot, "src"), (n) => /\.test\.tsx?$/.test(n)).concat(
    walk(join(ieRoot, "tests"), (n) => n.endsWith(".spec.tsx")),
  );
  const engineTests = walk(join(engineRoot, "src"), (n) => /\.test\.ts$/.test(n));

  const dirty = git("status --porcelain", root)
    .split(/\r?\n/)
    .filter(Boolean).length;

  return {
    branch: git("rev-parse --abbrev-ref HEAD", root) || "(unknown)",
    dirty,
    commits: git("log -5 --pretty=format:%h\u001f%s\u001f%cr", root)
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => {
        const [hash, subject, when] = l.split("\u001f");
        return { hash, subject, when };
      }),
    recipeDocs: recipeDocs.length,
    recipeSpecs: recipeSpecs.length,
    ieTests: ieTests.length,
    engineTests: engineTests.length,
  };
}
