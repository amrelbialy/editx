import type { ThemePresetValues } from "@editx/image-editor";
import { amberMinimalDark, amberMinimalLight } from "./amber-minimal";
import { amethystHazeDark, amethystHazeLight } from "./amethyst-haze";
import { catppuccinDark, catppuccinLight } from "./catppuccin";
import { claudeDark, claudeLight } from "./claude";
import { cosmicNightDark, cosmicNightLight } from "./cosmic-night";
import { cyberpunkDark, cyberpunkLight } from "./cyberpunk";
import { graphiteDark, graphiteLight } from "./graphite";
import { kodamaGroveDark, kodamaGroveLight } from "./kodama-grove";
import { mochaMouseDark, mochaMousseLight } from "./mocha-mousse";
import { natureDark, natureLight } from "./nature";
import { neoBrutalismDark, neoBrutalismLight } from "./neo-brutalism";
import { neutralDark, neutralLight } from "./neutral";
import { oceanBreezeDark, oceanBreezeLight } from "./ocean-breeze";
import { pastelDreamsDark, pastelDreamsLight } from "./pastel-dreams";
import { slateDark, slateLight } from "./slate";
import { stoneDark, stoneLight } from "./stone";
import { sunsetHorizonDark, sunsetHorizonLight } from "./sunset-horizon";
import { t3ChatDark, t3ChatLight } from "./t3-chat";
import { vercelDark, vercelLight } from "./vercel";
import { vintagePaperDark, vintagePaperLight } from "./vintage-paper";
import { zincDark, zincLight } from "./zinc";

export const demoPresets: Record<string, ThemePresetValues> = {
  "zinc-dark": zincDark,
  "zinc-light": zincLight,
  "slate-dark": slateDark,
  "slate-light": slateLight,
  "neutral-dark": neutralDark,
  "neutral-light": neutralLight,
  "stone-dark": stoneDark,
  "stone-light": stoneLight,
  "amber-minimal-dark": amberMinimalDark,
  "amber-minimal-light": amberMinimalLight,
  "amethyst-haze-dark": amethystHazeDark,
  "amethyst-haze-light": amethystHazeLight,
  "catppuccin-dark": catppuccinDark,
  "catppuccin-light": catppuccinLight,
  "cyberpunk-dark": cyberpunkDark,
  "cyberpunk-light": cyberpunkLight,
  "claude-dark": claudeDark,
  "claude-light": claudeLight,
  "vercel-dark": vercelDark,
  "vercel-light": vercelLight,
  "mocha-mousse-dark": mochaMouseDark,
  "mocha-mousse-light": mochaMousseLight,
  "kodama-grove-dark": kodamaGroveDark,
  "kodama-grove-light": kodamaGroveLight,
  "cosmic-night-dark": cosmicNightDark,
  "cosmic-night-light": cosmicNightLight,
  "nature-dark": natureDark,
  "nature-light": natureLight,
  "neo-brutalism-dark": neoBrutalismDark,
  "neo-brutalism-light": neoBrutalismLight,
  "ocean-breeze-dark": oceanBreezeDark,
  "ocean-breeze-light": oceanBreezeLight,
  "sunset-horizon-dark": sunsetHorizonDark,
  "sunset-horizon-light": sunsetHorizonLight,
  "vintage-paper-dark": vintagePaperDark,
  "vintage-paper-light": vintagePaperLight,
  "graphite-dark": graphiteDark,
  "graphite-light": graphiteLight,
  "pastel-dreams-dark": pastelDreamsDark,
  "pastel-dreams-light": pastelDreamsLight,
  "t3-chat-dark": t3ChatDark,
  "t3-chat-light": t3ChatLight,
};
