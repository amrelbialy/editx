import type { EditxEngine, TextBackgroundPadding } from "@editx/engine";
import { colorToHex, hexToColor } from "@editx/engine";
import { Link, Unlink } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { useTranslation } from "../../i18n/i18n-context";
import { ColorPicker } from "../ui/color-picker";
import { IconButton } from "../ui/icon-button";
import { Input } from "../ui/input";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";

export interface TextBackgroundBoxGroupProps {
  engine: EditxEngine;
  blockId: number;
  swatches?: string[];
}

type PaddingSide = keyof TextBackgroundPadding;

const PADDING_SIDES = ["top", "right", "bottom", "left"] as const;

const PADDING_LABEL_KEYS = {
  top: "textBackground.paddingTop",
  right: "textBackground.paddingRight",
  bottom: "textBackground.paddingBottom",
  left: "textBackground.paddingLeft",
} as const;

interface BoxState {
  enabled: boolean;
  /** Opaque `#rrggbb` — alpha travels separately so a translucent box round-trips. */
  color: string;
  alpha: number;
  cornerRadius: number;
  padding: TextBackgroundPadding;
  /** Curved text suppresses the box paint — the data is kept, so we only hint. */
  curved: boolean;
}

function readBox(engine: EditxEngine, blockId: number): BoxState {
  const box = engine.block.getTextBackground(blockId);
  return {
    enabled: box.enabled,
    // colorToHex emits rgba() below full alpha, which no <input type="color"> accepts.
    color: colorToHex({ ...box.color, a: 1 }),
    alpha: box.color.a,
    cornerRadius: box.cornerRadius,
    padding: box.padding,
    curved: engine.block.getTextCurve(blockId) !== null,
  };
}

function isUniform(padding: TextBackgroundPadding): boolean {
  return (
    padding.top === padding.right &&
    padding.right === padding.bottom &&
    padding.bottom === padding.left
  );
}

/** Unclamped: the engine stores negative padding as given, tightening the box inward. */
function toPx(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Block-level text background box — the rounded rect painted behind the whole
 * text block (distinct from the per-run highlight pill). Box shadow and stroke
 * reuse the block's existing shadow/stroke panels.
 */
export const TextBackgroundBoxGroup: React.FC<TextBackgroundBoxGroupProps> = (props) => {
  const { engine, blockId, swatches } = props;

  const { t } = useTranslation();
  const { commit, flush } = useCoalescedHistory(engine);

  const [state, setState] = useState<BoxState>(() => readBox(engine, blockId));
  const [linked, setLinked] = useState<boolean>(() => isUniform(state.padding));

  const refresh = useCallback(() => setState(readBox(engine, blockId)), [engine, blockId]);

  const handleToggle = useCallback(
    (next: boolean) => {
      // Discrete control: close any open burst so the toggle is its own entry and paints now.
      flush();
      engine.block.setTextBackgroundEnabled(blockId, next);
      refresh();
    },
    [engine, blockId, flush, refresh],
  );

  const handleColor = useCallback(
    (hex: string) => {
      const { a } = engine.block.getTextBackground(blockId).color;
      commit(() => engine.block.setTextBackground(blockId, { color: { ...hexToColor(hex), a } }));
      refresh();
    },
    [engine, blockId, commit, refresh],
  );

  const handleAlpha = useCallback(
    (alpha: number) => {
      const color = engine.block.getTextBackground(blockId).color;
      commit(() => engine.block.setTextBackground(blockId, { color: { ...color, a: alpha } }));
      refresh();
    },
    [engine, blockId, commit, refresh],
  );

  const handleCornerRadius = useCallback(
    (value: number) => {
      commit(() => engine.block.setTextBackground(blockId, { cornerRadius: value }));
      refresh();
    },
    [engine, blockId, commit, refresh],
  );

  const handlePaddingAll = useCallback(
    (value: number) => {
      commit(() => engine.block.setTextBackground(blockId, { padding: value }));
      refresh();
    },
    [engine, blockId, commit, refresh],
  );

  const handlePaddingSide = useCallback(
    (side: PaddingSide, value: number) => {
      commit(() => engine.block.setTextBackground(blockId, { padding: { [side]: value } }));
      refresh();
    },
    [engine, blockId, commit, refresh],
  );

  useEffect(() => {
    const next = readBox(engine, blockId);
    setState(next);
    setLinked(isUniform(next.padding));
  }, [engine, blockId]);

  useEffect(() => engine.onHistoryChanged(refresh), [engine, refresh]);

  return (
    <div className="flex flex-col gap-2">
      {state.curved && (
        <p className="text-fluid text-muted-foreground">{t("textBackground.curvedNotice")}</p>
      )}
      <SwitchField
        label={t("textBackground.enableBox")}
        checked={state.enabled}
        onChange={handleToggle}
      >
        <div className="flex flex-col gap-3">
          <ColorPicker
            color={state.color}
            opacity={state.alpha}
            swatches={swatches}
            onChange={handleColor}
            onOpacityChange={handleAlpha}
            showHexInput={false}
          />
          <SliderField
            label={t("textBackground.cornerRadius")}
            value={state.cornerRadius}
            min={0}
            max={200}
            step={1}
            onChange={handleCornerRadius}
            onCommit={flush}
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-fluid font-medium text-muted-foreground">
                {t("textBackground.padding")}
              </span>
              <IconButton
                variant={linked ? "default" : "ghost"}
                onClick={() => setLinked((prev) => !prev)}
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
                value={state.padding.top}
                onChange={(e) => handlePaddingAll(toPx(e.target.value))}
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
                    value={state.padding[side]}
                    onChange={(e) => handlePaddingSide(side, toPx(e.target.value))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </SwitchField>
    </div>
  );
};
