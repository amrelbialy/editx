export interface InputGroupProps {
  label?: string;
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: "number" | "text";
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  "data-testid"?: string;
}
