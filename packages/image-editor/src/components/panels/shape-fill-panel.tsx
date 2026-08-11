import {
  type Color,
  colorToHex,
  type EditxEngine,
  FILL_SOLID_COLOR,
  type FillType,
  hexToColor,
  type ImageFillFit,
} from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../../i18n/i18n-context";
import type { TranslationKey } from "../../i18n/translations/en";
import {
  ColorSwatch,
  Input,
  Section,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui";

export interface ShapeFillPanelProps {
  engine: EditxEngine;
  blockId: number;
}

interface FillState {
  kind: FillType;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  imageSrc: string;
  imageFit: ImageFillFit;
}

const FIT_VALUES: ImageFillFit[] = ["cover", "contain", "tile", "stretch"];

function toHex(color: string): string {
  return color.startsWith("#") ? color.substring(0, 7) : color;
}

function readFillState(engine: EditxEngine, blockId: number): FillState {
  const fillId = engine.block.getFill(blockId);
  const kind = (fillId != null ? engine.block.getKind(fillId) : "color") as FillType;
  const gradient = engine.block.getFillGradient(blockId);
  const image = engine.block.getFillImage(blockId);
  return {
    kind,
    gradientStart: toHex(gradient?.stops[0]?.color ?? "#f97316"),
    gradientEnd: toHex(gradient?.stops[gradient.stops.length - 1]?.color ?? "#ec4899"),
    gradientAngle: gradient?.angle ?? 0,
    imageSrc: image?.src ?? "",
    imageFit: image?.fit ?? "cover",
  };
}

/**
 * Fill-kind editor for shape (graphic) blocks: switch between Color / Gradient /
 * Image and edit each kind's parameters. Every mutation routes through an
 * undoable engine command (`changeFillKind` / `setFillGradient` / `setFillImage`).
 */
export const ShapeFillPanel: React.FC<ShapeFillPanelProps> = (props) => {
  const { engine, blockId } = props;

  const { t } = useTranslation();

  const [state, setState] = useState<FillState>(() => readFillState(engine, blockId));

  useEffect(() => {
    setState(readFillState(engine, blockId));
  }, [engine, blockId]);

  useEffect(() => {
    return engine.onHistoryChanged(() => setState(readFillState(engine, blockId)));
  }, [engine, blockId]);

  const applyGradient = useCallback(
    (start: string, end: string, angle: number) => {
      engine.block.setFillGradient(blockId, {
        type: "linear",
        angle,
        stops: [
          { offset: 0, color: start },
          { offset: 1, color: end },
        ],
      });
    },
    [engine, blockId],
  );

  const handleKind = useCallback(
    (kind: FillType) => {
      engine.block.changeFillKind(blockId, kind);
      const next = readFillState(engine, blockId);
      if (kind === "gradient")
        applyGradient(next.gradientStart, next.gradientEnd, next.gradientAngle);
      else if (kind === "image" && next.imageSrc)
        engine.block.setFillImage(blockId, { src: next.imageSrc, fit: next.imageFit });
      setState({ ...next, kind });
    },
    [engine, blockId, applyGradient],
  );

  const handleSolidColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fillId = engine.block.getFill(blockId);
      if (fillId != null) engine.block.setFillSolidColor(blockId, hexToColor(e.target.value));
      setState((s) => ({ ...s, gradientStart: e.target.value }));
    },
    [engine, blockId],
  );

  const handleGradient = useCallback(
    (patch: Partial<Pick<FillState, "gradientStart" | "gradientEnd" | "gradientAngle">>) => {
      setState((s) => {
        const next = { ...s, ...patch };
        applyGradient(next.gradientStart, next.gradientEnd, next.gradientAngle);
        return next;
      });
    },
    [applyGradient],
  );

  const handleImageSrc = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const src = e.target.value;
      setState((s) => {
        engine.block.setFillImage(blockId, { src, fit: s.imageFit });
        return { ...s, imageSrc: src };
      });
    },
    [engine, blockId],
  );

  const handleFit = useCallback(
    (fit: string) => {
      setState((s) => {
        engine.block.setFillImage(blockId, { src: s.imageSrc, fit: fit as ImageFillFit });
        return { ...s, imageFit: fit as ImageFillFit };
      });
    },
    [engine, blockId],
  );

  const solidColor = (() => {
    const fillId = engine.block.getFill(blockId);
    const c: Color | null = fillId != null ? engine.block.getColor(fillId, FILL_SOLID_COLOR) : null;
    return c ? colorToHex(c).substring(0, 7) : "#3b82f6";
  })();

  return (
    <div className="flex flex-col gap-3 p-1">
      <SegmentedControl<FillType>
        ariaLabel={t("fill.kind")}
        value={state.kind}
        onValueChange={handleKind}
        options={[
          { value: "color", label: t("fill.color") },
          { value: "gradient", label: t("fill.gradient") },
          { value: "image", label: t("fill.image") },
        ]}
      />

      {state.kind === "color" && (
        <Section label={t("fill.color")}>
          <div className="flex items-center gap-2">
            <ColorSwatch value={solidColor} onChange={handleSolidColor} />
            <span className="text-fluid font-mono text-muted-foreground">{solidColor}</span>
          </div>
        </Section>
      )}

      {state.kind === "gradient" && (
        <Section label={t("fill.stops")}>
          <div className="flex items-center gap-2">
            <ColorSwatch
              value={state.gradientStart}
              onChange={(e) => handleGradient({ gradientStart: e.target.value })}
            />
            <ColorSwatch
              value={state.gradientEnd}
              onChange={(e) => handleGradient({ gradientEnd: e.target.value })}
            />
            <Input
              type="number"
              label={t("fill.angle")}
              value={state.gradientAngle}
              min={0}
              max={360}
              className="flex-1"
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v)) handleGradient({ gradientAngle: v });
              }}
            />
          </div>
        </Section>
      )}

      {state.kind === "image" && (
        <>
          <Section label={t("fill.source")}>
            <Input type="text" value={state.imageSrc} onChange={handleImageSrc} />
          </Section>
          <Section label={t("fill.fit")}>
            <Select value={state.imageFit} onValueChange={handleFit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIT_VALUES.map((fit) => (
                  <SelectItem key={fit} value={fit}>
                    {t(`fill.fit${fit[0].toUpperCase()}${fit.slice(1)}` as TranslationKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>
        </>
      )}
    </div>
  );
};
