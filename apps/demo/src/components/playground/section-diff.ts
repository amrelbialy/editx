import { DEFAULT_PLAYGROUND_CONFIG } from "./playground.constants";
import type { PlaygroundConfig } from "./playground.types";

/** Count how many of the given keys differ from the default config. */
export function countChanged(
  config: PlaygroundConfig,
  keys: readonly (keyof PlaygroundConfig)[],
): number {
  return keys.reduce((count, key) => {
    const a = JSON.stringify(config[key]);
    const b = JSON.stringify(DEFAULT_PLAYGROUND_CONFIG[key]);
    return a === b ? count : count + 1;
  }, 0);
}
