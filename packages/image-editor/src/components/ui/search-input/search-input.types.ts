import type React from "react";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "prefix"> {
  /** Current query value (controlled). */
  value: string;
  /** Fired with the new query on every keystroke. */
  onValueChange: (value: string) => void;
  /** Fired when the clear affordance is pressed. Defaults to `onValueChange("")`. */
  onClear?: () => void;
  /** Placeholder text (injected — the primitive never reads i18n). */
  placeholder?: string;
  /** Accessible name for the input. */
  ariaLabel?: string;
  /** Accessible name for the clear button. */
  clearLabel?: string;
  /** Wrapper className. */
  className?: string;
}
