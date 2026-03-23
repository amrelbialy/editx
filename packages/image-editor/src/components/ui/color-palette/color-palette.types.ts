export interface ColorPaletteProps {
  colors: string[];
  value: string;
  onSelect: (color: string) => void;
  className?: string;
}
