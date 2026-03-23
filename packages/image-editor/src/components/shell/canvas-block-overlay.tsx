import type React from "react";
import type { AlignDirection } from "../../hooks/use-block-actions";
import { BlockActionBar } from "./block-action-bar";

interface CanvasBlockOverlayProps {
  blockType: string;
  screenRect: { x: number; y: number; width: number; height: number };
  isEditingText: boolean;
  onEditText?: () => void;
  onReplaceImage?: (file: File) => void;
  blockActions: {
    bringForward: () => void;
    sendBackward: () => void;
    bringToFront: () => void;
    sendToBack: () => void;
    duplicate: () => void;
    deleteBlock: () => void;
    alignToPage: (direction: AlignDirection) => void;
  };
}

export const CanvasBlockOverlay: React.FC<CanvasBlockOverlayProps> = (props) => {
  const { blockType, screenRect, isEditingText, onEditText, onReplaceImage, blockActions } = props;

  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{
        left: screenRect.x + screenRect.width / 2,
        top: screenRect.y - 8,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="pointer-events-auto" data-text-toolbar>
        {!isEditingText && (
          <BlockActionBar
            blockType={blockType}
            onEdit={blockType === "text" ? onEditText : undefined}
            onReplace={blockType === "image" ? onReplaceImage : undefined}
            onBringForward={blockActions.bringForward}
            onSendBackward={blockActions.sendBackward}
            onBringToFront={blockActions.bringToFront}
            onSendToBack={blockActions.sendToBack}
            onDuplicate={blockActions.duplicate}
            onDelete={blockActions.deleteBlock}
            onAlign={blockActions.alignToPage}
          />
        )}
      </div>
    </div>
  );
};
