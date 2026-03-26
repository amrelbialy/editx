import type { ShapeType } from "@creative-editor/engine";
import { Circle, Hexagon, MoveRight, Pentagon, Square, Star, Triangle } from "lucide-react";
import type React from "react";
import { useCallback } from "react";
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
    icon: <Square className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  },
  {
    id: "ellipse",
    type: "ellipse",
    label: "Ellipse",
    icon: <Circle className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  },
  {
    id: "triangle",
    type: "polygon",
    label: "Triangle",
    icon: <Triangle className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
    sides: 3,
  },
  {
    id: "pentagon",
    type: "polygon",
    label: "Pentagon",
    icon: <Pentagon className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
    sides: 5,
  },
  {
    id: "hexagon",
    type: "polygon",
    label: "Hexagon",
    icon: <Hexagon className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
    sides: 6,
  },
  {
    id: "star",
    type: "star",
    label: "Star",
    icon: <Star className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  },
  {
    id: "line",
    type: "line",
    label: "Arrow",
    icon: <MoveRight className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  },
];

export const ShapesPanel: React.FC<ShapesPanelProps> = ({ onAddShape }) => {
  const handleSelect = useCallback(
    (id: string) => {
      const shape = SHAPES.find((s) => s.id === id);
      if (shape) onAddShape(shape.type, shape.sides);
    },
    [onAddShape],
  );

  return (
    <Section label="Shapes">
      <SelectionGrid items={SHAPES} onSelect={handleSelect} columns={3} ariaLabel="Shape types" />
    </Section>
  );
};
