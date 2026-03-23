import React, { useRef } from 'react';
import {
  Replace,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Copy,
  Trash2,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Pencil,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Separator } from '../ui/separator';
import { cn } from '../../utils/cn';
import type { AlignDirection } from '../../hooks/use-block-actions';

export interface BlockActionBarProps {
  blockType: string;
  onReplace?: (file: File) => void;
  onEdit?: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAlign: (direction: AlignDirection) => void;
}

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}> = ({ icon, label, onClick, variant = 'default' }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        className={cn(
          'h-7 w-7 rounded-md flex items-center justify-center transition-colors',
          variant === 'destructive'
            ? 'text-destructive hover:bg-destructive/10'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        {icon}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);



export const BlockActionBar: React.FC<BlockActionBarProps> = ({
  blockType,
  onReplace,
  onEdit,
  onBringForward,
  onSendBackward,
  onDuplicate,
  onDelete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isImage = blockType === 'image';
  const isText = blockType === 'text';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 h-9 px-1.5',
        'bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg',
        'animate-in fade-in-0 slide-in-from-bottom-1 duration-150',
      )}
    >
      {/* Edit (text only) */}
      {isText && onEdit && (
        <>
          <ActionButton
            icon={<Pencil className="h-3.5 w-3.5" />}
            label="Edit Text"
            onClick={onEdit}
          />
          <Separator orientation="vertical" className="h-4 mx-0.5" />
        </>
      )}

      {/* Replace (image only) */}
      {isImage && onReplace && (
        <>
          <ActionButton
            icon={<Replace className="h-3.5 w-3.5" />}
            label="Replace Image"
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(file);
              e.target.value = '';
            }}
            className="hidden"
          />
          <Separator orientation="vertical" className="h-4 mx-0.5" />
        </>
      )}

      {/* Z-order */}
      <ActionButton
        icon={<ChevronUp className="h-3.5 w-3.5" />}
        label="Bring Forward"
        onClick={onBringForward}
      />
      <ActionButton
        icon={<ChevronDown className="h-3.5 w-3.5" />}
        label="Send Backward"
        onClick={onSendBackward}
      />

      <Separator orientation="vertical" className="h-4 mx-0.5" />

      {/* Duplicate */}
      <ActionButton
        icon={<Copy className="h-3.5 w-3.5" />}
        label="Duplicate"
        onClick={onDuplicate}
      />

      {/* Delete */}
      <ActionButton
        icon={<Trash2 className="h-3.5 w-3.5" />}
        label="Delete"
        onClick={onDelete}
        variant="destructive"
      />
    </div>
  );
};
