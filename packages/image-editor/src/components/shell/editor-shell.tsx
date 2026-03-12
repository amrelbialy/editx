import React, { useCallback, useState } from 'react';
import { cn } from '../../utils/cn';
import { PopoverContainerProvider } from '../ui/popover-container-context';

interface EditorShellProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const EditorShell: React.FC<EditorShellProps> = ({ children, className, style }) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const shellRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  return (
    <div
      ref={shellRef}
      role="application"
      aria-label="Image editor"
      style={style}
      className={cn(
        'flex flex-col h-full w-full overflow-hidden',
        'bg-background text-foreground',
        className,
      )}
    >
      <PopoverContainerProvider value={container ?? undefined}>
        {children}
      </PopoverContainerProvider>
    </div>
  );
};
