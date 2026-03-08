import React from 'react';

export interface RotatePanelProps {
  /** Current image rotation in degrees (-180 to 180). */
  rotation: number;
  /** Whether the image is flipped horizontally. */
  flipH: boolean;
  /** Whether the image is flipped vertically. */
  flipV: boolean;
  /** Called when the slider value changes. */
  onRotationChange: (angle: number) => void;
  /** Rotate 90° clockwise. */
  onRotateClockwise: () => void;
  /** Rotate 90° counter-clockwise. */
  onRotateCounterClockwise: () => void;
  /** Toggle horizontal flip. */
  onFlipHorizontal: () => void;
  /** Toggle vertical flip. */
  onFlipVertical: () => void;
  /** Reset rotation and flip to defaults. */
  onReset: () => void;
}

export const RotatePanel: React.FC<RotatePanelProps> = ({
  rotation,
  flipH,
  flipV,
  onRotationChange,
  onRotateClockwise,
  onRotateCounterClockwise,
  onFlipHorizontal,
  onFlipVertical,
  onReset,
}) => {
  return (
    <div className="flex flex-col gap-3 p-2 bg-gray-800 border-r border-gray-700 min-w-[180px]">
      <div className="text-xs text-gray-400 font-medium px-2 py-1">Rotate &amp; Flip</div>

      {/* Rotation slider */}
      <div className="px-2">
        <label className="text-xs text-gray-400 block mb-1">
          Rotation: {Math.round(rotation)}°
        </label>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotation}
          onChange={(e) => onRotationChange(Number(e.target.value))}
          className="w-full accent-blue-500"
          data-testid="rotation-slider"
        />
      </div>

      {/* 90° rotation buttons */}
      <div className="flex gap-1 px-2">
        <button
          onClick={onRotateCounterClockwise}
          data-testid="rotate-ccw"
          className="flex-1 px-2 py-1.5 rounded text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
          title="Rotate 90° counter-clockwise"
        >
          ↺ −90°
        </button>
        <button
          onClick={onRotateClockwise}
          data-testid="rotate-cw"
          className="flex-1 px-2 py-1.5 rounded text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
          title="Rotate 90° clockwise"
        >
          ↻ +90°
        </button>
      </div>

      {/* Flip buttons */}
      <div className="flex gap-1 px-2">
        <button
          onClick={onFlipHorizontal}
          data-testid="flip-h"
          className={`flex-1 px-2 py-1.5 rounded text-sm transition-colors ${
            flipH
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 bg-gray-700 hover:bg-gray-600'
          }`}
          title="Flip horizontally"
        >
          ⇔ Flip H
        </button>
        <button
          onClick={onFlipVertical}
          data-testid="flip-v"
          className={`flex-1 px-2 py-1.5 rounded text-sm transition-colors ${
            flipV
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 bg-gray-700 hover:bg-gray-600'
          }`}
          title="Flip vertically"
        >
          ⇕ Flip V
        </button>
      </div>

      {/* Reset */}
      <div className="px-2">
        <button
          onClick={onReset}
          data-testid="rotate-reset"
          className="w-full px-2 py-1.5 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors border border-gray-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
