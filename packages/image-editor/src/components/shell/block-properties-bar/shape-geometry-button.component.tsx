import type { EditxEngine, ShapeType } from "@editx/engine";
import { ArrowRight, ChevronDown, Hexagon, Radius, Star } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { ShapeGeometrySection } from "../../panels/shape-geometry-section.component";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../../ui";

interface ShapeGeometryButtonProps {
  engine: EditxEngine;
  blockId: number;
}

const controls = {
  rect: { label: "Corner Radius", icon: Radius },
  polygon: { label: "Sides", icon: Hexagon },
  star: { label: "Star", icon: Star },
  line: { label: "Arrow", icon: ArrowRight },
} as const;

function readKind(engine: EditxEngine, blockId: number): ShapeType {
  const shapeId = engine.block.getShape(blockId);
  return engine.block.getKind(shapeId ?? blockId) as ShapeType;
}

export const ShapeGeometryButton: React.FC<ShapeGeometryButtonProps> = (props) => {
  const { engine, blockId } = props;
  const [kind, setKind] = useState(() => readKind(engine, blockId));

  useEffect(() => setKind(readKind(engine, blockId)), [engine, blockId]);
  useEffect(
    () => engine.onHistoryChanged(() => setKind(readKind(engine, blockId))),
    [engine, blockId],
  );

  const control = controls[kind as keyof typeof controls];
  if (!control) return null;
  const Icon = control.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-1.5 px-2.5 h-8 text-xs whitespace-nowrap text-muted-foreground"
        >
          <Icon className="h-4 w-4" />
          {control.label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 p-3"
        align="center"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <ShapeGeometrySection engine={engine} blockId={blockId} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
