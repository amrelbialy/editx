import { spawnSync } from "node:child_process";

const mode = process.argv.includes("--check") ? "check" : "write";
const pnpmScript = process.env.npm_execpath;
if (!pnpmScript) throw new Error("Run this script through pnpm");

const result = spawnSync(
  process.execPath,
  [
    pnpmScript,
    "exec",
    "playwright",
    "test",
    "tests/preset-thumbnail-generation.spec.tsx",
    "-c",
    "playwright-ct.config.js",
    "--project=chromium",
    "--workers=1",
    "--reporter=line",
  ],
  {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, EDITX_THUMBNAIL_MODE: mode },
    stdio: "inherit",
  },
);

process.exitCode = result.status ?? 1;