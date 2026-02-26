import React, { useEffect, useRef, useState } from 'react';
import { CreativeEngine, IMAGE_SRC } from '@creative-editor/engine';
import { useImageEditorStore } from './store/image-editor-store';
import { loadImage, sourceToUrl, revokeObjectUrl } from './utils/load-image';
import { ImageEditorToolbar } from './components/toolbar';

export interface ImageEditorProps {
  src: string | File | Blob;
  onSave?: (blob: Blob) => void;
  width?: string | number;
  height?: string | number;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  src,
  onSave,
  width = '100%',
  height = '100vh',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CreativeEngine | null>(null);
  const [engine, setEngine] = useState<CreativeEngine | null>(null);

  const setOriginalImage = useImageEditorStore((s) => s.setOriginalImage);
  const setLoading = useImageEditorStore((s) => s.setLoading);
  const setImageBlockId = useImageEditorStore((s) => s.setImageBlockId);
  const isLoading = useImageEditorStore((s) => s.isLoading);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;

    async function init() {
      if (!containerRef.current) return;

      setLoading(true);

      const imgUrl = sourceToUrl(src);
      if (typeof src !== 'string') {
        objectUrl = imgUrl;
      }

      const htmlImg = await loadImage(imgUrl);
      if (disposed) return;

      const naturalWidth = htmlImg.naturalWidth;
      const naturalHeight = htmlImg.naturalHeight;

      setOriginalImage({
        src: imgUrl,
        width: naturalWidth,
        height: naturalHeight,
      });

      const ce = await CreativeEngine.create({
        container: containerRef.current!,
      });
      if (disposed) return;

      engineRef.current = ce;

      await ce.scene.create({ width: naturalWidth, height: naturalHeight });

      const pageId = ce.scene.getCurrentPage();
      if (pageId === null) return;

      const blockId = ce.block.create('image');
      ce.block.setString(blockId, IMAGE_SRC, imgUrl);
      ce.block.setSize(blockId, naturalWidth, naturalHeight);
      ce.block.setPosition(blockId, 0, 0);
      ce.block.appendChild(pageId, blockId);

      setImageBlockId(blockId);
      setLoading(false);
      setEngine(ce);
    }

    init();

    return () => {
      disposed = true;
      if (objectUrl) revokeObjectUrl(objectUrl);
      engineRef.current?.dispose();
    };
  }, [src]);

  return (
    <div
      style={{ width, height }}
      className="flex flex-col bg-gray-900 overflow-hidden"
    >
      <ImageEditorToolbar />
      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 h-full" />
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-white text-lg">Loading image...</div>
        </div>
      )}
    </div>
  );
};
