import { readFileSync } from "node:fs";
import type { BlockData } from "../block/block.types";

export const migrationFixtures = ["native-v1", "legacy-scene-v1", "legacy-scene-v2"] as const;

export interface LegacyMigrationFixture {
  version: 1 | 2;
  blocks: BlockData[];
  activeSceneId?: number | null;
  activePageId?: number | null;
}

export function readMigrationFixture(name: string): unknown {
  const path = new URL(`./fixtures/documents/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(path, "utf8"));
}

export function readLegacyMigrationFixture(version: 1 | 2): LegacyMigrationFixture {
  return readMigrationFixture(`legacy-scene-v${version}`) as LegacyMigrationFixture;
}

export function freezeMigrationFixture(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  for (const child of Object.values(value)) freezeMigrationFixture(child);
  Object.freeze(value);
}
