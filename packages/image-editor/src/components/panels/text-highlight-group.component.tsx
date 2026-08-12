import type { EditxEngine, TextBackgroundPadding, TextRunStyle } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { useTranslation } from "../../i18n/i18n-context";
import { ColorPicker } from "../ui/color-picker";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";
import {
  isUniformPadding,
  type PaddingSide,
  TextBackgroundPaddingEditor,
} from "./text-background-padding-editor.component";

export interface TextHighlightGroupProps {
  engine: EditxEngine;
  blockId: number;
  /** Character range the mutation applies to (whole block or selection). */
  getStyleRange: () => { start: number; end: number };
  /** Offset used to read the displayed highlight style (selection start). */
  selectionStart?: number;
  swatches?: string[];
}

/** Default highlight colour used when the background is toggled on. */
const DEFAULT_HIGHLIGHT = "#FDE68A";

interface HighlightState {
  enabled: boolean;
  color: string;
  /** 0..1 alpha of the highlight pill (resolved: unset = fully opaque). */
  opacity: number;
  /** px (resolved: unset = 0). */
  cornerRadius: number;
  /** px per side (resolved: unset = 0). */
  padding: TextBackgroundPadding;
}

function readHighlight(
  engine: EditxEngine,
  blockId: number,
  selectionStart?: number,
): HighlightState {
  const runs = engine.block.getTextRuns(blockId);
  let style: TextRunStyle = runs[0]?.style ?? {};
  if (selectionStart != null && selectionStart > 0) {
    let offset = 0;
    for (const run of runs) {
      if (offset + run.text.length > selectionStart) {
        style = run.style;
        break;
      }
      offset += run.text.length;
    }
  }
  const color = style.backgroundColor ?? "";
  const padding = style.backgroundPadding;
  return {
    enabled: color !== "",
    color: color || DEFAULT_HIGHLIGHT,
    opacity: style.backgroundOpacity ?? 1,
    cornerRadius: style.backgroundCornerRadius ?? 0,
    padding: {
      top: padding?.top ?? 0,
      right: padding?.right ?? 0,
      bottom: padding?.bottom ?? 0,
      left: padding?.left ?? 0,
    },
  };
}

/**
 * Per-run text highlight controls — the padded pill behind the selected glyphs,
 * stored on the run's `backgroundColor`/`backgroundOpacity`/`backgroundCornerRadius`/
 * `backgroundPadding` (distinct from the block-level box in `TextBackgroundBoxGroup`).
 */
export const TextHighlightGroup: React.FC<TextHighlightGroupProps> = (props) => {
  const { engine, blockId, getStyleRange, selectionStart, swatches } = props;

  const { t } = useTranslation();
  const { commit, flush } = useCoalescedHistory(engine);

  const [state, setState] = useState<HighlightState>(() =>
    readHighlight(engine, blockId, selectionStart),
  );
  const [linked, setLinked] = useState<boolean>(() => isUniformPadding(state.padding));

  const handleToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    if (state.enabled) {
      commit(() => engine.block.setTextBackgroundColor(blockId, start, end, undefined));
      setState((s) => ({ ...s, enabled: false }));
    } else {
      const color = state.color || DEFAULT_HIGHLIGHT;
      commit(() => engine.block.setTextBackgroundColor(blockId, start, end, color));
      setState((s) => ({ ...s, enabled: true, color }));
    }
  }, [engine, blockId, getStyleRange, state.enabled, state.color, commit]);

  const handleColorChange = useCallback(
    (newColor: string) => {
      const { start, end } = getStyleRange();
      commit(() => engine.block.setTextBackgroundColor(blockId, start, end, newColor));
      setState((s) => ({ ...s, enabled: true, color: newColor }));
    },
    [engine, blockId, getStyleRange, commit],
  );

  const handleOpacityChange = useCallback(
    (opacity: number) => {
      const { start, end } = getStyleRange();
      commit(() => engine.block.setTextBackgroundOpacity(blockId, start, end, opacity));
      setState((s) => ({ ...s, opacity }));
    },
    [engine, blockId, getStyleRange, commit],
  );

  const handleCornerRadiusChange = useCallback(
    (radius: number) => {
      const { start, end } = getStyleRange();
      commit(() => engine.block.setTextBackgroundCornerRadius(blockId, start, end, radius));
      setState((s) => ({ ...s, cornerRadius: radius }));
    },
    [engine, blockId, getStyleRange, commit],
  );

  const handlePaddingAll = useCallback(
    (value: number) => {
      const { start, end } = getStyleRange();
      const next: TextBackgroundPadding = { top: value, right: value, bottom: value, left: value };
      commit(() => engine.block.setTextBackgroundPadding(blockId, start, end, next));
      setState((s) => ({ ...s, padding: next }));
    },
    [engine, blockId, getStyleRange, commit],
  );

  const handlePaddingSide = useCallback(
    (side: PaddingSide, value: number) => {
      const { start, end } = getStyleRange();
      const next = { ...state.padding, [side]: value };
      commit(() => engine.block.setTextBackgroundPadding(blockId, start, end, next));
      setState((s) => ({ ...s, padding: next }));
    },
    [engine, blockId, getStyleRange, state.padding, commit],
  );

  useEffect(() => {
    const next = readHighlight(engine, blockId, selectionStart);
    setState(next);
    setLinked(isUniformPadding(next.padding));
  }, [engine, blockId, selectionStart]);

  useEffect(() => {
    return engine.onHistoryChanged(() => {
      const next = readHighlight(engine, blockId, selectionStart);
      setState(next);
      setLinked(isUniformPadding(next.padding));
    });
  }, [engine, blockId, selectionStart]);

  return (
    <SwitchField
      label={t("textBackground.enableHighlight")}
      checked={state.enabled}
      onChange={handleToggle}
    >
      <div className="flex flex-col gap-3">
        <ColorPicker
          color={state.color}
          opacity={state.opacity}
          swatches={swatches}
          onChange={handleColorChange}
          onOpacityChange={handleOpacityChange}
          showHexInput={false}
        />
        <SliderField
          label={t("textBackground.cornerRadius")}
          value={state.cornerRadius}
          min={0}
          max={200}
          step={1}
          onChange={handleCornerRadiusChange}
          onCommit={flush}
        />
        <TextBackgroundPaddingEditor
          label={t("textBackground.highlightPadding")}
          tooltip={t("textBackground.highlightPaddingTooltip")}
          padding={state.padding}
          linked={linked}
          onToggleLinked={() => setLinked((prev) => !prev)}
          onChangeAll={handlePaddingAll}
          onChangeSide={handlePaddingSide}
        />
      </div>
    </SwitchField>
  );
};
