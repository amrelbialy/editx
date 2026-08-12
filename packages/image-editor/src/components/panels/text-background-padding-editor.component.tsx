import type { TextBackgroundPadding } from "@editx/engine";
import { Info, Link, Unlink } from "lucide-react";
import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { IconButton } from "../ui/icon-button";
import { Input } from "../ui/input";

export type PaddingSide = keyof TextBackgroundPadding;

export const PADDING_SIDES = ["top", "right", "bottom", "left"] as const;

const PADDING_LABEL_KEYS = {
  top: "textBackground.paddingTop",
  right: "textBackground.paddingRight",
  bottom: "textBackground.paddingBottom",
  left: "textBackground.paddingLeft",
} as const;

/** True when all four sides share one value (drives the linked/unlinked editor mode). */
export function isUniformPadding(padding: TextBackgroundPadding): boolean {
  return (
    padding.top === padding.right &&
    padding.right === padding.bottom &&
    padding.bottom === padding.left
  );
}

/** Unclamped: callers store negative padding as given, tightening the box/pill inward. */
export function toPx(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface TextBackgroundPaddingEditorProps {
  label: string;
  tooltip: string;
  padding: TextBackgroundPadding;
  linked: boolean;
  onToggleLinked: () => void;
  onChangeAll: (value: number) => void;
  onChangeSide: (side: PaddingSide, value: number) => void;
}

/** Linked/unlinked per-side padding editor shared by the block box and per-run highlight. */
export const TextBackgroundPaddingEditor: React.FC<TextBackgroundPaddingEditorProps> = (props) => {
  const { label, tooltip, padding, linked, onToggleLinked, onChangeAll, onChangeSide } = props;

  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <span className="text-fluid font-medium text-muted-foreground">{label}</span>
          <IconButton size="icon" label={tooltip} tooltipSide="top" icon={<Info />} />
        </div>
        <IconButton
          variant={linked ? "default" : "ghost"}
          onClick={onToggleLinked}
          label={linked ? t("textBackground.unlinkPadding") : t("textBackground.linkPadding")}
          icon={linked ? <Link /> : <Unlink />}
        />
      </div>
      {linked ? (
        <Input
          type="number"
          label={t("textBackground.paddingAll")}
          aria-label={t("textBackground.paddingAll")}
          labelClassName="w-12"
          value={padding.top}
          onChange={(e) => onChangeAll(toPx(e.target.value))}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {PADDING_SIDES.map((side) => (
            <Input
              key={side}
              type="number"
              label={t(PADDING_LABEL_KEYS[side])}
              aria-label={t(PADDING_LABEL_KEYS[side])}
              labelClassName="w-12"
              value={padding[side]}
              onChange={(e) => onChangeSide(side, toPx(e.target.value))}
            />
          ))}
        </div>
      )}
    </div>
  );
};
