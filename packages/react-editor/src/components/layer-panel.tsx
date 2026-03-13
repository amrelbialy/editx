import React from "react";
import type { CreativeEngine } from "@creative-editor/engine";
import { useSelectedBlockId, useBlockChildren } from "../hooks/use-engine";

interface LayerPanelProps {
  engine: CreativeEngine;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({ engine }) => {
  const selectedBlockId = useSelectedBlockId(engine);
  const pageId = engine.scene.getCurrentPage();
  const blockIds = useBlockChildren(engine, pageId);

  return (
    <div className="w-56 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold mb-3 text-gray-500 uppercase tracking-wide">
        Layers
      </h2>
      <div className="space-y-1">
        {blockIds.length === 0 ? (
          <p className="text-sm text-gray-400">No layers</p>
        ) : (
          [...blockIds].reverse().map((id) => {
            const type = engine.block.getType(id) ?? "unknown";
            const kind = engine.block.getKind(id);
            const label = kind ? `${type} (${kind})` : type;
            const isSelected = selectedBlockId === id;

            return (
              <div
                key={id}
                onClick={() => engine.block.select(id)}
                className={`px-3 py-2 rounded cursor-pointer transition-colors text-sm ${
                  isSelected
                    ? "bg-blue-50 border border-blue-300 text-blue-700"
                    : "bg-gray-50 hover:bg-gray-100 border border-transparent text-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{label}</span>
                  <span className="text-xs text-gray-400">#{id}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
