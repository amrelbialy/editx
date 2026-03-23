export interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  formatValue?: (value: number) => string;
  className?: string;
  "data-testid"?: string;
}
