import type React from "react";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Optional accessible label when the visible label is an icon. */
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  /** Accessible label for the group. */
  ariaLabel?: string;
}
