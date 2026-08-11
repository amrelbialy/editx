import type { EditxEngine, TextRunStyle } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { useTranslation } from "../../i18n/i18n-context";
import { ColorPicker } from "../ui/color-picker";
import { Section } from "../ui/section";
import { SwitchField } from "../ui/switch-field";
import { TextBackgroundBoxGroup } from "./text-background-box-group.component";

/** Default highlight colour used when the background is toggled on. */
const DEFAULT_HIGHLIGHT = "#FDE68A";

export interface TextBackgroundSectionProps {
  engine: EditxEngine;
  blockId: number;
  /** Character range the mutation applies to (whole block or selection). */
  getStyleRange: () => { start: number; end: number };
  /** Offset used to read the displayed background style (selection start). */
  selectionStart?: number;
  swatches?: string[];
}

interface BackgroundState {
  enabled: boolean;
  color: string;
}

function readBackground(
  engine: EditxEngine,
  blockId: number,
  selectionStart?: number,
): BackgroundState {
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
  return { enabled: color !== "", color: color || DEFAULT_HIGHLIGHT };
}

/**
 * Text background controls, split by scope so the two are never confused: the
 * per-run *highlight* (the padded pill behind the selected glyphs, stored as the
 * run's `backgroundColor`) and the block-level *box* (a rounded rect behind the
 * whole block, written through the text-background API).
 */
export const TextBackgroundSection: React.FC<TextBackgroundSectionProps> = (props) => {
  const { engine, blockId, getStyleRange, selectionStart, swatches } = props;

  const { t } = useTranslation();
  const { commit } = useCoalescedHistory(engine);

  const [state, setState] = useState<BackgroundState>(() =>
    readBackground(engine, blockId, selectionStart),
  );

  const handleToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    if (state.enabled) {
      commit(() => engine.block.setTextBackgroundColor(blockId, start, end, undefined));
      setState((s) => ({ ...s, enabled: false }));
    } else {
      const color = state.color || DEFAULT_HIGHLIGHT;
      commit(() => engine.block.setTextBackgroundColor(blockId, start, end, color));
      setState({ enabled: true, color });
    }
  }, [engine, blockId, getStyleRange, state.enabled, state.color, commit]);

  const handleColorChange = useCallback(
    (newColor: string) => {
      const { start, end } = getStyleRange();
      commit(() => engine.block.setTextBackgroundColor(blockId, start, end, newColor));
      setState({ enabled: true, color: newColor });
    },
    [engine, blockId, getStyleRange, commit],
  );

  useEffect(() => {
    setState(readBackground(engine, blockId, selectionStart));
  }, [engine, blockId, selectionStart]);

  useEffect(() => {
    return engine.onHistoryChanged(() => setState(readBackground(engine, blockId, selectionStart)));
  }, [engine, blockId, selectionStart]);

  return (
    <div className="flex flex-col gap-3">
      <Section label={t("textBackground.highlight")}>
        <p className="text-fluid text-muted-foreground">{t("textBackground.highlightHint")}</p>
        <SwitchField
          label={t("textBackground.enableHighlight")}
          checked={state.enabled}
          onChange={handleToggle}
        >
          <ColorPicker
            color={state.color}
            swatches={swatches}
            onChange={handleColorChange}
            showHexInput={false}
          />
        </SwitchField>
      </Section>

      {engine.block.supportsTextBackground(blockId) && (
        <Section label={t("textBackground.box")} separator>
          <p className="text-fluid text-muted-foreground">{t("textBackground.boxHint")}</p>
          <TextBackgroundBoxGroup engine={engine} blockId={blockId} swatches={swatches} />
        </Section>
      )}
    </div>
  );
};
