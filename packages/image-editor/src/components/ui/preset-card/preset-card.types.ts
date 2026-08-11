import type React from "react";

export interface PresetCardProps {
  /** Fired when the tile is activated. */
  onClick: () => void;
  /** Accessible name (the visible label is optional / decorative). */
  ariaLabel: string;
  /** Optional caption rendered under the thumbnail. */
  label?: string;
  /** The thumbnail content (e.g. a rendered preview). */
  children: React.ReactNode;
  /** Marks the tile as selected/active. */
  active?: boolean;
  /** Wrapper className (e.g. width in a carousel vs. grid). */
  className?: string;
}
