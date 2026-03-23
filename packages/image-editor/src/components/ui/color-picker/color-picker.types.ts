export interface ColorPickerProps {
  color: string;
  opacity?: number;
  onChange: (color: string) => void;
  onOpacityChange?: (opacity: number) => void;
  swatches?: string[];
  showHexInput?: boolean;
}

export const DEFAULT_COLORS = [
  "#FFFFFF",
  "#000000",
  "#3B82F6",
  "#6366F1",
  "#10B981",
  "#059669",
  "#EF4444",
  "#DC2626",
  "#F59E0B",
  "#D97706",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#06B6D4",
  "#F97316",
  "#84CC16",
];
