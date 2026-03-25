export interface SelectionGridItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface SelectionGridProps {
  items: SelectionGridItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  columns?: number;
  className?: string;
  /** Accessible label for the group */
  ariaLabel?: string;
}
