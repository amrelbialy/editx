import React from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/cn';

interface ContextualBarProps {
  visible: boolean;
  onReset?: () => void;
  onDone?: () => void;
  children?: React.ReactNode;
}

export const ContextualBar: React.FC<ContextualBarProps> = ({
  visible,
  onReset,
  onDone,
  children,
}) => {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between h-10 px-4',
        'bg-card border-b border-border',
        'animate-in fade-in-0 slide-in-from-top-1 duration-150',
      )}
    >
      {/* Tool-specific controls */}
      <div className="flex items-center gap-2 flex-1">
        {children}
      </div>

      {/* Right: Reset + Done (always present) */}
      <div className="flex items-center gap-1.5">
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
        {onDone && (
          <Button variant="default" size="sm" onClick={onDone} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Done
          </Button>
        )}
      </div>
    </div>
  );
};
