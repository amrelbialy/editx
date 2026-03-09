import React from 'react';
import { FILTER_PRESETS, type FilterPresetInfo } from '@creative-editor/engine';

export interface FilterPanelProps {
  activeFilter: string;
  onSelect: (name: string) => void;
}

const presetEntries = Array.from(FILTER_PRESETS.entries());

export const FilterPanel: React.FC<FilterPanelProps> = ({ activeFilter, onSelect }) => {
  return (
    <div className="flex flex-col gap-1 p-2 bg-gray-800 border-r border-gray-700 min-w-[200px] overflow-y-auto">
      <div className="text-xs text-gray-400 font-medium px-2 py-1">Filters</div>

      {/* Original (no filter) */}
      <button
        onClick={() => onSelect('')}
        data-testid="filter-original"
        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
          activeFilter === ''
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
      >
        Original
      </button>

      {/* Preset list */}
      {presetEntries.map(([name, info]) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          data-testid={`filter-${name}`}
          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
            activeFilter === name
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          {info.label}
        </button>
      ))}
    </div>
  );
};
