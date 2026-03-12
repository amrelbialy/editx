import React from 'react';
import { cn } from '../../utils/cn';

interface CanvasAreaProps {
  /** Ref passed to the container div where Konva mounts */
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** Content rendered above the canvas (e.g. block properties bar) */
  header?: React.ReactNode;
  children?: React.ReactNode;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({ canvasRef, header, children }) => {
  return (
    <div className={cn('relative flex flex-col flex-1 min-w-0 overflow-hidden')} role="region" aria-label="Image canvas">
      {header && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-1rem)]">
          {header}
        </div>
      )}
      <div ref={canvasRef} className="relative flex-1 min-h-0" />
      {children}
    </div>
  );
};
