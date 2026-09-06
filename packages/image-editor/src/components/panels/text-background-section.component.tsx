import type { EditxEngine } from "@editx/engine";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { Section, SegmentedControl } from "../ui";
import { TextBackgroundBoxGroup } from "./text-background-box-group.component";
import { TextHighlightGroup } from "./text-highlight-group.component";

type BackgroundEditor = "frame" | "highlight";

export interface TextBackgroundSectionProps {
  engine: EditxEngine;
  blockId: number;
  /** Character range the mutation applies to (whole block or selection). */
  getStyleRange: () => { start: number; end: number };
  /** Offset used to read the displayed background style (selection start). */
  selectionStart?: number;
  swatches?: string[];
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

  const [editor, setEditor] = useState<BackgroundEditor>(() => {
    const frameActive = engine.block.getTextBackground(blockId).enabled;
    const highlightActive = engine.block
      .getTextRuns(blockId)
      .some((run) => Boolean(run.style.backgroundColor));
    return highlightActive && !frameActive ? "highlight" : "frame";
  });

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl<BackgroundEditor>
        ariaLabel={t("textBackground.editor")}
        options={[
          { value: "frame", label: t("textBackground.frame") },
          { value: "highlight", label: t("textBackground.highlight") },
        ]}
        value={editor}
        onValueChange={setEditor}
      />

      {editor === "frame" ? (
        engine.block.supportsTextBackground(blockId) && (
          <Section label={t("textBackground.frame")}>
            <p className="text-fluid text-muted-foreground">{t("textBackground.frameHint")}</p>
            <TextBackgroundBoxGroup engine={engine} blockId={blockId} swatches={swatches} />
          </Section>
        )
      ) : (
        <Section label={t("textBackground.highlight")}>
          <p className="text-fluid text-muted-foreground">{t("textBackground.highlightHint")}</p>
          <TextHighlightGroup
            engine={engine}
            blockId={blockId}
            getStyleRange={getStyleRange}
            selectionStart={selectionStart}
            swatches={swatches}
          />
        </Section>
      )}
    </div>
  );
};
