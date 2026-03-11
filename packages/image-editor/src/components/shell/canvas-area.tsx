import React from 'react';
import { cn } from '../../utils/cn';

interface CanvasAreaProps {
  /** Ref passed to the container div where Konva mounts */
  canvasRef: React.RefObject<HTMLDivElement | null>;
  children?: React.ReactNode;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({ canvasRef, children }) => {
  return (
    <div className={cn('flex flex-col flex-1 min-w-0 overflow-hidden')} role="region" aria-label="Image canvas">
      <div ref={canvasRef} className="relative flex-1 min-h-0" />
      {children}
    </div>
  );
};
