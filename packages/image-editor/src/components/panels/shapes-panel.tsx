import type { ShapeType } from "@editx/engine";
import { Circle, Hexagon, MoveRight, Pentagon, Square, Star, Triangle } from "lucide-react";
import type React from "react";
import { useCallback } from "react";
import { useConfig } from "../../config/config-context";
import { Section } from "../ui/section";
import type { SelectionGridItem } from "../ui/selection-grid";
import { SelectionGrid } from "../ui/selection-grid";

export interface ShapesPanelProps {
  onAddShape: (shapeType: ShapeType, sides?: number) => void;
}

interface ShapeDef extends SelectionGridItem {
  type: ShapeType;
  sides?: number;
}

const SHAPES: ShapeDef[] = [
  {
    id: "rect",
    type: "rect",
    label: "Rectangle",
    icon: <Square className="h-5 w-5 @5xl/editor:h-6 @5xl/editor:w-6" />,
  },
  {
    id: "ellipse",
    type: "ellipse",
    label: "Ellipse",
    icon: <Circle className="h-5 w-5 @5xl/editor:h-6 @5xl/editor:w-6" />,
  },
  {
    id: "triangle",
    type: "polygon",
    label: "Triangle",
    icon: <Triangle className="h-5 w-5 @5xl/editor:h-6 @5xl/editor:w-6" />,
    sides: 3,
  },
  {
    id: "pentagon",
    type: "polygon",
    label: "Pentagon",
    icon: <Pentagon className="h-5 w-5 @5xl/editor:h-6 @5xl/editor:w-6" />,
    sides: 5,
  },
  {
    id: "hexagon",
    type: "polygon",
    label: "Hexagon",
    icon: <Hexagon className="h-5 w-5 @5xl/editor:h-6 @5xl/editor:w-6" />,
    sides: 6,
  },
  {
    id: "star",
    type: "star",
    label: "Star",
    icon: <Star className="h-5 w-5 @5xl/editor:h-6 @5xl/editor:w-6" />,
  },
  {
    id: "line",
    type: "line",
    label: "Arrow",
    icon: <MoveRight className="h-5 w-5 @5xl/editor:h-6 @5xl/editor:w-6" />,
  },
];

export const ShapesPanel: React.FC<ShapesPanelProps> = ({ onAddShape }) => {
  const config = useConfig();

  const allowed = config.shapes?.presets;
  const visibleShapes = allowed ? SHAPES.filter((s) => allowed.includes(s.id)) : SHAPES;

  const handleSelect = useCallback(
    (id: string) => {
      const shape = SHAPES.find((s) => s.id === id);
      if (shape) onAddShape(shape.type, shape.sides);
    },
    [onAddShape],
  );

  return (
    <Section label="Shapes">
      <SelectionGrid
        items={visibleShapes}
        onSelect={handleSelect}
        columns={3}
        ariaLabel="Shape types"
      />
    </Section>
  );
};
