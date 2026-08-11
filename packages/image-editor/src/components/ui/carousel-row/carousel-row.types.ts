import type React from "react";

export interface CarouselRowProps {
  /** The scrollable items. */
  children: React.ReactNode;
  /** Accessible name for the scroll region. */
  ariaLabel?: string;
  /** Accessible name for the scroll-left chevron. */
  leftLabel: string;
  /** Accessible name for the scroll-right chevron. */
  rightLabel: string;
  /** Pixels scrolled per chevron press. Defaults to 220. */
  scrollStep?: number;
  /** Wrapper className. */
  className?: string;
}
