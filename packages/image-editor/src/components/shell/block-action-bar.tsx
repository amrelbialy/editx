import { ChevronDown, ChevronUp, Copy, Pencil, Replace, Trash2 } from "lucide-react";
import type React from "react";
import { useRef } from "react";
import type { AlignDirection } from "../../hooks/use-block-actions";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";
import { IconButton } from "../ui/icon-button";
import { Separator } from "../ui/separator";

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
  <IconButton
    onClick={onClick}
    label={label}
    icon={icon}
    className={cn(
      variant === "destructive"
        ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
        : "text-muted-foreground",
    )}
  />
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
  const isText = blockType === "text";
  const { t } = useTranslation();

  return (
    <fieldset
      aria-label={t("a11y.blockActions")}
      className={cn(
        "inline-flex items-center gap-0.5 h-9 px-1.5",
        "bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-lg",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-150",
      )}
    >
      {/* Edit (text only) */}
      {isText && onEdit && (
        <>
          <ActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t("action.editText")}
            onClick={onEdit}
          />
          <Separator orientation="vertical" className="h-4 mx-0.5" />
        </>
      )}

      {onReplace && (
        <>
          <ActionButton
            icon={<Replace className="h-4 w-4" />}
            label={t("action.replaceImage")}
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
        label={t("action.bringForward")}
        onClick={onBringForward}
      />
      <ActionButton
        icon={<ChevronDown className="h-4 w-4" />}
        label={t("action.sendBackward")}
        onClick={onSendBackward}
      />

      <Separator orientation="vertical" className="h-4 mx-0.5" />

      {/* Duplicate */}
      <ActionButton
        icon={<Copy className="h-4 w-4" />}
        label={t("action.duplicate")}
        onClick={onDuplicate}
      />

      {/* Delete */}
      <ActionButton
        icon={<Trash2 className="h-4 w-4" />}
        label={t("action.delete")}
        onClick={onDelete}
        variant="destructive"
      />
    </fieldset>
  );
};
