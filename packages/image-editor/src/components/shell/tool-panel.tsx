import React from 'react';
import { X } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { cn } from '../../utils/cn';

interface ToolPanelProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  open,
  title,
  onClose,
  children,
}) => {
  if (!open) return null;

  return (
    <aside
      role="region"
      aria-label={title ?? 'Tool options'}
      data-text-toolbar
      className={cn(
        'flex flex-col w-[280px] shrink-0',
        'bg-card border-r border-border',
        'animate-in slide-in-from-left-2 duration-200',
      )}
    >
      {/* Panel header */}
      {title && (
        <div className="flex items-center justify-between h-10 pl-3 pr-1 border-b border-border">
          <span className="text-sm font-medium">{title}</span>
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" />
          </Button>

        </div>
      )}

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {children}
        </div>
      </ScrollArea>
    </aside>
  );
};
