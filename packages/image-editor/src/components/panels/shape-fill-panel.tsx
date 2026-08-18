import {
  type EditxEngine,
  type FillType,
  type GradientType,
  hexToColor,
  type ImageFill,
} from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig } from "../../config/config-context";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";
import { ColorPicker, SegmentedControl } from "../ui";
import { GradientControls } from "./gradient-controls.component";
import {
  mergeActiveShapeFillState,
  readShapeFillState,
  type ShapeFillState,
} from "./shape-fill-state";
import { ShapeImageFillControls } from "./shape-image-fill-controls.component";

export interface ShapeFillPanelProps {
  engine: EditxEngine;
  blockId: number;
  enabled?: boolean;
}

/**
 * Fill-kind editor for shape (graphic) blocks: switch between Color / Gradient /
 * Image and edit each kind's parameters. Every mutation routes through an
 * undoable engine command (`changeFillKind` / `setFillGradient` / `setFillImage`).
 */
export const ShapeFillPanel: React.FC<ShapeFillPanelProps> = (props) => {
  const { engine, blockId, enabled } = props;

  const stateRef = useRef<ShapeFillState | null>(null);

  const { t } = useTranslation();
  const config = useConfig();

  const [state, setState] = useState<ShapeFillState>(() => readShapeFillState(engine, blockId));
  stateRef.current = state;

  const { commit } = useCoalescedHistory(engine);

  useEffect(() => {
    setState(readShapeFillState(engine, blockId));
  }, [engine, blockId]);

  useEffect(() => {
    return engine.onHistoryChanged(() => {
      const fresh = readShapeFillState(engine, blockId);
      setState((current) => mergeActiveShapeFillState(current, fresh));
    });
  }, [engine, blockId]);

  const applyGradient = useCallback(
    (type: GradientType, start: string, end: string, angle: number) => {
      engine.block.setFillGradient(blockId, {
        type,
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
      const current = stateRef.current;
      if (!current || current.kind === kind) return;

      const next = { ...current, kind };
      stateRef.current = next;
      setState(next);

      const fillId = engine.block.getFill(blockId);
      const activeKind = fillId == null ? null : engine.block.getKind(fillId);
      if (activeKind === kind || (kind === "image" && !current.image.src)) return;

      engine.block.changeFillKind(blockId, kind);
      if (kind === "color") {
        engine.block.setFillSolidColor(blockId, hexToColor(current.solidColor));
      } else if (kind === "gradient") {
        applyGradient(
          current.gradientType,
          current.gradientStart,
          current.gradientEnd,
          current.gradientAngle,
        );
      } else {
        engine.block.setFillImage(blockId, current.image);
      }
    },
    [engine, blockId, applyGradient],
  );

  const handleSolidColor = useCallback(
    (color: string) => {
      const fillId = engine.block.getFill(blockId);
      if (fillId != null) {
        commit(() => engine.block.setFillSolidColor(blockId, hexToColor(color)));
      }
      setState((current) => ({ ...current, solidColor: color }));
    },
    [engine, blockId, commit],
  );

  const handleOpacity = useCallback(
    (opacity: number) => {
      commit(() => engine.block.setOpacity(blockId, opacity));
      setState((current) => ({ ...current, opacity }));
    },
    [engine, blockId, commit],
  );

  const handleGradient = useCallback(
    (
      patch: Partial<
        Pick<ShapeFillState, "gradientType" | "gradientStart" | "gradientEnd" | "gradientAngle">
      >,
    ) => {
      const current = stateRef.current;
      if (!current) return;
      const next = { ...current, ...patch };
      applyGradient(next.gradientType, next.gradientStart, next.gradientEnd, next.gradientAngle);
      setState(next);
    },
    [applyGradient],
  );

  const handleImageChange = useCallback(
    (image: ImageFill) => {
      const fillId = engine.block.getFill(blockId);
      const activeKind = fillId == null ? null : engine.block.getKind(fillId);
      if (activeKind !== "image" && image.src) {
        engine.beginBatch();
        engine.block.changeFillKind(blockId, "image");
        engine.block.setFillImage(blockId, image);
        engine.endBatch();
      } else if (activeKind === "image") {
        engine.block.setFillImage(blockId, image);
      }
      setState((current) => ({ ...current, kind: "image", image }));
    },
    [engine, blockId],
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-1 transition-opacity",
        !(enabled ?? state.enabled) && "opacity-50",
      )}
    >
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
        <ColorPicker
          color={state.solidColor}
          opacity={state.opacity}
          swatches={config.colors}
          onChange={handleSolidColor}
          onOpacityChange={handleOpacity}
        />
      )}

      {state.kind === "gradient" && (
        <GradientControls
          type={state.gradientType}
          angle={state.gradientAngle}
          startColor={state.gradientStart}
          endColor={state.gradientEnd}
          opacity={state.opacity}
          onTypeChange={(gradientType) => handleGradient({ gradientType })}
          onAngleChange={(gradientAngle) => handleGradient({ gradientAngle })}
          onStartColorChange={(gradientStart) => handleGradient({ gradientStart })}
          onEndColorChange={(gradientEnd) => handleGradient({ gradientEnd })}
          onOpacityChange={handleOpacity}
        />
      )}

      {state.kind === "image" && (
        <ShapeImageFillControls
          image={state.image}
          opacity={state.opacity}
          imageConfig={config.image}
          onChange={handleImageChange}
          onOpacityChange={handleOpacity}
        />
      )}
    </div>
  );
};
