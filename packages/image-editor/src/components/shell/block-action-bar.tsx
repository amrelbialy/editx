import { ChevronDown, ChevronUp, Copy, Pencil, Replace, Trash2 } from "lucide-react";
import type React from "react";
import { useRef } from "react";
import type { AlignDirection } from "../../hooks/use-block-actions";
import { cn } from "../../utils/cn";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

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
  variant?: "default" | "destructive";
}> = ({ icon, label, onClick, variant = "default" }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
          variant === "destructive"
            ? "text-destructive hover:bg-destructive/10"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
  const isImage = blockType === "image";
  const isText = blockType === "text";

  return (
    <fieldset
      aria-label="Block actions"
      className={cn(
        "inline-flex items-center gap-0.5 h-9 px-1.5",
        "bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-150",
      )}
    >
      {/* Edit (text only) */}
      {isText && onEdit && (
        <>
          <ActionButton icon={<Pencil className="h-4 w-4" />} label="Edit Text" onClick={onEdit} />
          <Separator orientation="vertical" className="h-4 mx-0.5" />
        </>
      )}

      {/* Replace (image only) */}
      {isImage && onReplace && (
        <>
          <ActionButton
            icon={<Replace className="h-4 w-4" />}
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
              e.target.value = "";
            }}
            className="hidden"
          />
          <Separator orientation="vertical" className="h-4 mx-0.5" />
        </>
      )}

      {/* Z-order */}
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

      <Separator orientation="vertical" className="h-4 mx-0.5" />

      {/* Duplicate */}
      <ActionButton icon={<Copy className="h-4 w-4" />} label="Duplicate" onClick={onDuplicate} />

      {/* Delete */}
      <ActionButton
        icon={<Trash2 className="h-4 w-4" />}
        label="Delete"
        onClick={onDelete}
        variant="destructive"
      />
    </fieldset>
  );
};
