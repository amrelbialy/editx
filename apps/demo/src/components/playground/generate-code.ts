import { cropLines } from "./crop-serializer";
import { LOCALE_TRANSLATIONS } from "./locale-translations";
import { DEFAULT_PLAYGROUND_CONFIG } from "./playground.constants";
import type { PlaygroundConfig } from "./playground.types";

type Lines = string[];

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const strArr = (v: string[]) => `[${v.map((s) => `"${s}"`).join(", ")}]`;

/** Serialize a nested config block, indenting each line by `pad` spaces. */
function block(key: string, lines: Lines, pad: string): Lines {
  if (lines.length === 0) return [];
  return [`${pad}${key}: {`, ...lines.map((l) => `${pad}  ${l}`), `${pad}},`];
}

function themeLines(c: PlaygroundConfig, d: PlaygroundConfig): Lines {
  const lines: Lines = [];
  const isBuiltIn = c.themePreset === "dark" || c.themePreset === "light";
  lines.push(
    isBuiltIn
      ? `preset: "${c.themePreset}",`
      : `preset: "custom", colors: demoPresets["${c.themePreset}"],`,
  );
  if (c.borderRadius !== d.borderRadius) lines.push(`borderRadius: "${c.borderRadius}",`);
  if (c.fontFamily !== d.fontFamily) lines.push(`fontFamily: "${c.fontFamily}",`);
  return lines;
}

function uiLines(c: PlaygroundConfig, d: PlaygroundConfig): Lines {
  const lines: Lines = [];
  if (c.title !== d.title) lines.push(`title: "${c.title}",`);
  if (c.showTitle !== d.showTitle) lines.push(`showTitle: ${c.showTitle},`);
  if (c.unsavedChangesWarning !== d.unsavedChangesWarning)
    lines.push(`unsavedChangesWarning: ${c.unsavedChangesWarning},`);
  if (c.showCloseButton !== d.showCloseButton) lines.push(`showCloseButton: ${c.showCloseButton},`);
  if (c.showBackButton !== d.showBackButton) lines.push(`showBackButton: ${c.showBackButton},`);
  if (c.compactSidebar !== d.compactSidebar || c.groupSeparators !== d.groupSeparators)
    lines.push(
      `toolSidebar: { compact: ${c.compactSidebar}, groupSeparators: ${c.groupSeparators} },`,
    );
  return lines;
}

function textLines(c: PlaygroundConfig, d: PlaygroundConfig): Lines {
  const lines: Lines = [];
  const push = (k: string, v: string | number, def: string | number) => {
    if (v !== def) lines.push(`${k}: ${typeof v === "string" ? `"${v}"` : v},`);
  };
  push("defaultFontSize", c.textDefaultFontSize, d.textDefaultFontSize);
  push("defaultColor", c.textDefaultColor, d.textDefaultColor);
  push("defaultFontStyle", c.textDefaultFontStyle, d.textDefaultFontStyle);
  push("defaultTextAlign", c.textDefaultTextAlign, d.textDefaultTextAlign);
  push("defaultLineHeight", c.textDefaultLineHeight, d.textDefaultLineHeight);
  push("defaultLetterSpacing", c.textDefaultLetterSpacing, d.textDefaultLetterSpacing);
  push("minFontSize", c.textMinFontSize, d.textMinFontSize);
  push("maxFontSize", c.textMaxFontSize, d.textMaxFontSize);
  return lines;
}

function shapesLines(c: PlaygroundConfig, d: PlaygroundConfig): Lines {
  const lines: Lines = [];
  if (!eq(c.shapesPresets, d.shapesPresets)) lines.push(`presets: ${strArr(c.shapesPresets)},`);
  if (c.shapesDefaultFillMode !== d.shapesDefaultFillMode)
    lines.push(`defaultFillMode: "${c.shapesDefaultFillMode}",`);
  if (c.shapesDefaultColor !== d.shapesDefaultColor)
    lines.push(`defaultColor: "${c.shapesDefaultColor}",`);
  if (c.shapesDefaultStrokeColor !== d.shapesDefaultStrokeColor)
    lines.push(`defaultStrokeColor: "${c.shapesDefaultStrokeColor}",`);
  if (c.shapesDefaultStrokeWidth !== d.shapesDefaultStrokeWidth)
    lines.push(`defaultStrokeWidth: ${c.shapesDefaultStrokeWidth},`);
  if (c.shapesDefaultOpacity !== d.shapesDefaultOpacity)
    lines.push(`defaultOpacity: ${c.shapesDefaultOpacity},`);
  if (c.shapesDefaultCornerRadius !== d.shapesDefaultCornerRadius)
    lines.push(`defaultCornerRadius: ${c.shapesDefaultCornerRadius},`);
  if (c.shapesDefaultSize !== d.shapesDefaultSize)
    lines.push(`defaultSize: ${c.shapesDefaultSize},`);
  return lines;
}

function exportLines(c: PlaygroundConfig, d: PlaygroundConfig): Lines {
  const lines: Lines = [];
  if (!eq(c.exportFormats, d.exportFormats)) lines.push(`formats: ${strArr(c.exportFormats)},`);
  lines.push(`defaultFormat: "${c.exportFormat}",`, `quality: ${c.exportQuality},`);
  if (c.exportCloseAfterSave !== d.exportCloseAfterSave)
    lines.push(`closeAfterSave: ${c.exportCloseAfterSave},`);
  if (c.exportFilename) lines.push(`filename: "${c.exportFilename}",`);
  return lines;
}

/** Build the `<ImageEditor>` usage snippet from the current playground config. */
export function generatePlaygroundCode(c: PlaygroundConfig): string {
  const d = DEFAULT_PLAYGROUND_CONFIG;
  const body: Lines = [];

  if (!eq(c.tools, d.tools)) body.push(`tools: ${strArr(c.tools)},`);
  if (c.defaultTool) body.push(`defaultTool: "${c.defaultTool}",`);
  body.push(...block("theme", themeLines(c, d), ""));
  if (!eq(c.colors, d.colors)) body.push(`colors: ${strArr(c.colors)},`);
  body.push(...block("crop", cropLines(c, d), ""));
  if (!eq(c.adjustControls, d.adjustControls))
    body.push(...block("adjust", [`controls: ${strArr(c.adjustControls)},`], ""));
  if (!eq(c.filterPresets, d.filterPresets))
    body.push(...block("filter", [`presets: ${strArr(c.filterPresets)},`], ""));
  body.push(...block("text", textLines(c, d), ""));
  body.push(...block("shapes", shapesLines(c, d), ""));
  if (c.imageMaxFileSize !== d.imageMaxFileSize || c.imageMaxDimension !== d.imageMaxDimension)
    body.push(
      ...block(
        "image",
        [`maxFileSize: ${c.imageMaxFileSize},`, `maxDimension: ${c.imageMaxDimension},`],
        "",
      ),
    );
  body.push(...block("ui", uiLines(c, d), ""));
  body.push(...block("export", exportLines(c, d), ""));
  if (c.locale !== d.locale) {
    body.push(`locale: "${c.locale}",`);
    const overrides = LOCALE_TRANSLATIONS[c.locale];
    if (overrides)
      body.push(
        ...block(
          "translations",
          Object.entries(overrides).map(([k, v]) => `"${k}": "${v}",`),
          "",
        ),
      );
  }

  const configBlock = body.map((l) => `    ${l}`).join("\n");
  return `import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/your-image.jpg"
  config={{
${configBlock}
  }}
  onSave={(blob) => console.log("Saved:", blob)}
/>`;
}
