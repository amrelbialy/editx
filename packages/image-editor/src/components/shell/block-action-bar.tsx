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
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Separator } from '../ui/separator';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '../ui/dropdown-menu';
import { cn } from '../../utils/cn';
import type { AlignDirection } from '../../hooks/use-block-actions';

export interface BlockActionBarProps {
  blockType: string;
  onReplace?: (file: File) => void;
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

const ALIGN_OPTIONS: Array<{ dir: AlignDirection; icon: React.ReactNode; label: string }> = [
  { dir: 'left',   icon: <AlignStartVertical className="h-4 w-4" />,   label: 'Align Left' },
  { dir: 'center', icon: <AlignCenterVertical className="h-4 w-4" />,  label: 'Align Center' },
  { dir: 'right',  icon: <AlignEndVertical className="h-4 w-4" />,     label: 'Align Right' },
  { dir: 'top',    icon: <AlignStartHorizontal className="h-4 w-4" />, label: 'Align Top' },
  { dir: 'middle', icon: <AlignCenterHorizontal className="h-4 w-4" />,label: 'Align Middle' },
  { dir: 'bottom', icon: <AlignEndHorizontal className="h-4 w-4" />,   label: 'Align Bottom' },
];

export const BlockActionBar: React.FC<BlockActionBarProps> = ({
  blockType,
  onReplace,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onDuplicate,
  onDelete,
  onAlign,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isImage = blockType === 'image';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 h-9 px-1.5',
        'bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg',
        'animate-in fade-in-0 slide-in-from-bottom-1 duration-150',
      )}
    >
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

      {/* More z-order + alignment in dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="h-7 px-1.5 rounded-md flex items-center gap-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <ChevronsUp className="h-3 w-3" />
                <ChevronsDown className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Move &amp; Align</TooltipContent>
          </Tooltip>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto p-2" align="center">
          <div className="flex flex-col gap-2">
            {/* Move section */}
            <div className="text-xs font-medium text-muted-foreground px-1">Move</div>
            <div className="flex gap-0.5">
              <ActionButton
                icon={<ChevronsUp className="h-4 w-4" />}
                label="Bring to Front"
                onClick={onBringToFront}
              />
              <ActionButton
                icon={<ChevronUp className="h-4 w-4" />}
                label="Bring Forward"
                onClick={onBringForward}
              />
              <ActionButton
                icon={<ChevronDown className="h-4 w-4" />}
                label="Send Backward"
                onClick={onSendBackward}
              />
              <ActionButton
                icon={<ChevronsDown className="h-4 w-4" />}
                label="Send to Back"
                onClick={onSendToBack}
              />
            </div>

            <Separator className="my-1" />

            {/* Align section */}
            <div className="text-xs font-medium text-muted-foreground px-1">Align to Page</div>
            <div className="grid grid-cols-3 gap-0.5">
              {ALIGN_OPTIONS.map(({ dir, icon, label }) => (
                <ActionButton key={dir} icon={icon} label={label} onClick={() => onAlign(dir)} />
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

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
