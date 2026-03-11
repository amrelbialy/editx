import React from 'react';
import { cn } from '../../utils/cn';

interface EditorShellProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const EditorShell: React.FC<EditorShellProps> = ({ children, className, style }) => {
  return (
    <div
      role="application"
      aria-label="Image editor"
      style={style}
      className={cn(
        'flex flex-col h-full w-full overflow-hidden',
        'bg-background text-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
};
