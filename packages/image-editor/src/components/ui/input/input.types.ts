import type React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  /** Optional inline label rendered before the control. */
  label?: string;
  /** Text rendered inside the control, before the value (e.g. "#"). */
  prefix?: string;
  /** Text rendered inside the control, after the value (e.g. "px"). */
  suffix?: string;
  /** Wrapper className (applies to the outer label+control row). */
  className?: string;
  /** Label className (e.g. fixed width for alignment). */
  labelClassName?: string;
  /** Control className (applies to the bordered field). */
  fieldClassName?: string;
}
