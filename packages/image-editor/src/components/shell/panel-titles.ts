import type { PropertySidePanel } from "../../store/image-editor-store";

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
