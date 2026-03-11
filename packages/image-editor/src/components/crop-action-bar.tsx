import React from 'react';

export interface CropActionBarProps {
  onApply: () => void;
  onCancel: () => void;
}

export const CropActionBar: React.FC<CropActionBarProps> = ({ onApply, onCancel }) => {
  return (
    <div className="relative z-10 flex-shrink-0 flex items-center justify-center gap-3 px-4 py-2 bg-card border-t border-border">
      <button
        onClick={onCancel}
        data-testid="crop-cancel"
        className="px-5 py-1.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors border border-border"
      >
        Cancel
      </button>
      <button
        onClick={onApply}
        data-testid="crop-apply"
        className="px-5 py-1.5 rounded-md text-sm text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
      >
        Apply
      </button>
    </div>
  );
};
