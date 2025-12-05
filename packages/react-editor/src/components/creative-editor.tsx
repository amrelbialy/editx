import React, { useCallback, useEffect, useRef } from 'react';
import { CreativeDocument, CreativeEngine } from '@creative-editor/engine';
import { Toolbar } from './toolbar';
import { LayerPanel } from './layer-panel';
import { PropertiesPanel } from './properties-panel';
import { useEditorStore } from '../store/editor-store';

interface CreativeEditorProps {
  document: CreativeDocument;
  width?: number;
  height?: number;
}

export const CreativeEditor: React.FC<CreativeEditorProps> = ({
  width = 800,
  height = 600,
}) => {
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const sidebarOpen = useEditorStore((state) => state.sidebarOpen);
  const setSelectedLayer = useEditorStore((state) => state.setSelectedLayer);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CreativeEngine | null>(null);

  useEffect(() => {
    async function init() {
      if (!containerRef.current) return;

      // // Initial document
      // const initialDocument = {
      //   id: 'doc-1',
      //   version: 1,
      //   scene: { width: 1080, height: 1080, background: '#fff' },
      //   layers: {},
      // };

      // Create the editor engine (async!)
      const engine = await CreativeEngine.create({
        container: containerRef.current as HTMLElement,
      });
      console.log('engine', engine);
      engineRef.current = engine;

      await engine.scene.create({ width: 1080, height: 1080 });

      // Example usage:
      // engine.editor.setZoom(1);
      // engine.scene.setSize(1080, 1080);

      // create a rect
      // engine.layer.create({
      //   type: 'text',
      //   props: { text: 'Hello World', fontSize: 48, color: '#00aaff' },
      //   transform: { x: 300, y: 500 },
      // });
    }

    init();
    console.log('engineRef.current', engineRef.current);
  }, []); // run ONC

  // const handleLayerSelect = useCallback(
  //   (layerId: string) => {
  //     console.log('handleLayerSelect', layerId);
  //     console.log('editor.current', editor.current);
  //     editor.current?.controller.selectLayer(layerId);
  //   },
  //   [editor.current?.controller]
  // );

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* <Toolbar /> */}
      <div className="flex flex-1 overflow-hidden">
        {/* {sidebarOpen && (
          <LayerPanel layers={document.layers} onLayerSelect={handleLayerSelect} />
        )} */}
        {/* <Canvas
          key={version}
          layers={document.layers}
          config={{ width, height, backgroundColor: 0xffffff }}
        /> */}
        <div ref={containerRef} />
        {/* {sidebarOpen && (
          <PropertiesPanel
            key={selectedLayerId}
            document={document}
            controller={editor.current?.controller}
          />
        )} */}
      </div>
    </div>
  );
};
