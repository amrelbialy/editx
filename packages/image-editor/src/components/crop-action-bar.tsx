import React from 'react';

export interface CropActionBarProps {
  onApply: () => void;
  onCancel: () => void;
}

export const CropActionBar: React.FC<CropActionBarProps> = ({ onApply, onCancel }) => {
  return (
    <div className="relative z-10 flex-shrink-0 flex items-center justify-center gap-3 px-4 py-2 bg-gray-800 border-t border-gray-700">
      <button
        onClick={onCancel}
        data-testid="crop-cancel"
        className="px-5 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors border border-gray-600"
      >
        Cancel
      </button>
      <button
        onClick={onApply}
        data-testid="crop-apply"
        className="px-5 py-1.5 rounded text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        Apply
      </button>
    </div>
  );
};
