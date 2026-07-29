import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Register custom utilities so tailwind-merge classifies them correctly.
// Without this, `text-fluid` is treated as a text-color and gets merged away
// whenever a real color class (e.g. `text-muted-foreground`) is present.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["fluid"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
