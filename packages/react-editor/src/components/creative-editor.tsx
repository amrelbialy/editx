import React, { useEffect, useRef } from "react";
import { CreativeEngine } from "@creative-editor/engine";
import { useEditorStore } from "../store/editor-store";
import { Toolbar } from "./toolbar";
import { LayerPanel } from "./layer-panel";
import { PropertiesPanel } from "./properties-panel";

export const CreativeEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CreativeEngine | null>(null);
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    let disposed = false;

    async function init() {
      if (!containerRef.current) return;

      const engine = await CreativeEngine.create({
        container: containerRef.current,
      });

      if (disposed) return;

      engineRef.current = engine;

      await engine.scene.create({ width: 1080, height: 1080 });

      engine.core.on("stage:click", (worldPos: { x: number; y: number }) => {
        const tool = useEditorStore.getState().activeTool;
        if (tool === "select") return;

        const pageId = engine.scene.getCurrentPage();
        if (pageId === null) return;

        let blockId: number;

        if (tool === "rectangle") {
          blockId = engine.block.create("graphic");
          engine.block.setKind(blockId, "rect");
          engine.block.setSize(blockId, 100, 100);
          engine.block.setColor(blockId, "fill/color", {
            r: 0.85,
            g: 0.85,
            b: 0.85,
            a: 1,
          });
        } else if (tool === "circle") {
          blockId = engine.block.create("graphic");
          engine.block.setKind(blockId, "ellipse");
          engine.block.setSize(blockId, 100, 100);
          engine.block.setColor(blockId, "fill/color", {
            r: 0.85,
            g: 0.85,
            b: 0.85,
            a: 1,
          });
        } else if (tool === "text") {
          blockId = engine.block.create("text");
          engine.block.setSize(blockId, 200, 40);
        } else {
          return;
        }

        engine.block.setPosition(blockId, worldPos.x, worldPos.y);
        engine.block.appendChild(pageId, blockId);
        engine.editor.setSelection([blockId]);

        useEditorStore.getState().setActiveTool("select");
      });

      setReady(true);
    }

    init();

    return () => {
      disposed = true;
    };
  }, []);

  const engine = engineRef.current;
  console.log("engine", engine);
  console.log("ready", ready);
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {ready && engine && <LayerPanel engine={engine} />}
        <div ref={containerRef} className="flex-1 h-full" />
        {ready && engine && <PropertiesPanel engine={engine} />}
      </div>
    </div>
  );
};
