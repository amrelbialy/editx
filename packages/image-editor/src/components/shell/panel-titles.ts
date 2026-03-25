import type { TranslationKey } from "../../i18n/translations/en";
import type { PropertySidePanel } from "../../store/image-editor-store";

const toolPanelKeys: Record<string, TranslationKey> = {
  crop: "panel.crop",
  rotate: "panel.rotateFlip",
  adjust: "panel.adjustments",
  filter: "panel.filters",
  shapes: "panel.shapes",
  text: "panel.text",
  image: "panel.image",
};

export function getToolPanelTitleKey(activeTool: string): TranslationKey | undefined {
  return toolPanelKeys[activeTool];
}

export function getToolPanelTitle(
  activeTool: string,
  customTools?: { id: string; label: string }[],
): string | undefined {
  switch (activeTool) {
    case "crop":
      return "Crop";
    case "rotate":
      return "Rotate & Flip";
    case "adjust":
      return "Adjustments";
    case "filter":
      return "Filters";
    case "shapes":
      return "Shapes";
    case "text":
      return "Text";
    case "image":
      return "Image";
    default:
      return customTools?.find((t) => t.id === activeTool)?.label;
  }
}

const propertyPanelKeys: Record<string, TranslationKey> = {
  color: "panel.color",
  background: "panel.background",
  shadow: "panel.shadow",
  position: "panel.position",
  stroke: "panel.stroke",
  adjust: "panel.adjustments",
  filter: "panel.filters",
  imageFill: "panel.imageFill",
  "text-advanced": "panel.advanced",
};

export function getPropertyPanelTitleKey(
  panel: PropertySidePanel | null,
): TranslationKey | undefined {
  if (!panel) return undefined;
  return propertyPanelKeys[panel];
}

export function getPropertyPanelTitle(panel: PropertySidePanel | null): string | undefined {
  switch (panel) {
    case "color":
      return "Color";
    case "background":
      return "Background";
    case "shadow":
      return "Shadow";
    case "position":
      return "Position";
    case "stroke":
      return "Stroke";
    case "adjust":
      return "Adjustments";
    case "filter":
      return "Filters";
    case "imageFill":
      return "Image";
    case "text-advanced":
      return "Advanced";
    default:
      return undefined;
  }
}
