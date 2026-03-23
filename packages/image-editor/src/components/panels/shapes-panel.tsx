import type { ShapeType } from "@creative-editor/engine";
import { Circle, Hexagon, MoveRight, Pentagon, Square, Star, Triangle } from "lucide-react";
import type React from "react";

export interface ShapesPanelProps {
  onAddShape: (shapeType: ShapeType, sides?: number) => void;
}

const SHAPES: Array<{ type: ShapeType; label: string; icon: React.ReactNode; sides?: number }> = [
  { type: "rect", label: "Rectangle", icon: <Square className="h-5 w-5" /> },
  { type: "ellipse", label: "Ellipse", icon: <Circle className="h-5 w-5" /> },
  { type: "polygon", label: "Triangle", icon: <Triangle className="h-5 w-5" />, sides: 3 },
  { type: "polygon", label: "Pentagon", icon: <Pentagon className="h-5 w-5" />, sides: 5 },
  { type: "polygon", label: "Hexagon", icon: <Hexagon className="h-5 w-5" />, sides: 6 },
  { type: "star", label: "Star", icon: <Star className="h-5 w-5" /> },
  { type: "line", label: "Arrow", icon: <MoveRight className="h-5 w-5" /> },
];

export const ShapesPanel: React.FC<ShapesPanelProps> = ({ onAddShape }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium text-muted-foreground mb-1">Shapes</div>
      <div className="grid grid-cols-3 gap-1.5">
        {SHAPES.map((shape) => (
          <button
            key={shape.label}
            onClick={() => onAddShape(shape.type, shape.sides)}
            data-testid={`shape-${shape.label.toLowerCase()}`}
            className="flex flex-col items-center gap-1 rounded-md px-2 py-3 text-xs text-muted-foreground bg-muted hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {shape.icon}
            {shape.label}
          </button>
        ))}
      </div>
    </div>
  );
};
