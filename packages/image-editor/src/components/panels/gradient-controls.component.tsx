import type { GradientType } from "@editx/engine";
import type React from "react";
import { ColorSwatch, Input, Section, SegmentedControl, SliderField } from "../ui";

export interface GradientControlsProps {
  type: GradientType;
  angle: number;
  startColor: string;
  endColor: string;
  opacity: number;
  showTypeControl?: boolean;
  onTypeChange: (type: GradientType) => void;
  onAngleChange: (angle: number) => void;
  onStartColorChange: (color: string) => void;
  onEndColorChange: (color: string) => void;
  onOpacityChange: (opacity: number) => void;
}

export const GradientControls: React.FC<GradientControlsProps> = (props) => {
  const {
    type,
    angle,
    startColor,
    endColor,
    opacity,
    showTypeControl = true,
    onTypeChange,
    onAngleChange,
    onStartColorChange,
    onEndColorChange,
    onOpacityChange,
  } = props;

  return (
    <>
      {showTypeControl && (
        <SegmentedControl<GradientType>
          ariaLabel="Gradient type"
          value={type}
          onValueChange={onTypeChange}
          options={[
            { value: "linear", label: "Linear" },
            { value: "radial", label: "Radial" },
          ]}
        />
      )}
      <Section label="Stops">
        <div className="flex items-center gap-2">
          <ColorSwatch
            value={startColor}
            onChange={(event) => onStartColorChange(event.target.value)}
          />
          <ColorSwatch
            value={endColor}
            onChange={(event) => onEndColorChange(event.target.value)}
          />
          {type === "linear" && (
            <Input
              type="number"
              label="Angle"
              value={angle}
              min={0}
              max={360}
              className="flex-1"
              onChange={(event) => {
                const value = parseFloat(event.target.value);
                if (!Number.isNaN(value)) onAngleChange(value);
              }}
            />
          )}
        </div>
      </Section>
      <SliderField
        label="Opacity"
        value={Math.round(opacity * 100)}
        min={0}
        max={100}
        step={1}
        onChange={(value) => onOpacityChange(value / 100)}
      />
    </>
  );
};
