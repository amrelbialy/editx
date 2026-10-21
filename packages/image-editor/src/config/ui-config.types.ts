export type PageNavigationLayout = "vertical" | "horizontal";

export interface UIConfig {
  toolSidebar?: {
    /**
     * Compact the tool rail to an icon-only column, with tool names in
     * tooltips and accessible labels. Default: false.
     */
    compact?: boolean;
    groupSeparators?: boolean;
  };
  title?: string;
  showTitle?: boolean;
  /** Show close button (X) in topbar. Default: true when onClose is provided. */
  showCloseButton?: boolean;
  /** Show back arrow instead of X for close. Default: false. */
  showBackButton?: boolean;
  /** Show a confirmation dialog when closing with unsaved changes. Default: true. */
  unsavedChangesWarning?: boolean;
  /**
   * Arrange all pages on one continuous canvas with numbered page titles and
   * hover/selection outlines and page-management controls, without changing saved
   * visibility. Default: false.
   */
  pageNavigation?: boolean;
  /** Continuous canvas direction when page navigation is enabled. Default: "vertical". */
  pageLayout?: PageNavigationLayout;
}
