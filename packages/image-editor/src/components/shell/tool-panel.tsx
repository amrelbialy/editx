import { X } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface ToolPanelProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Docked (non-modal) mode for tools that need direct canvas interaction while
   * the panel is open (e.g. crop). On narrow screens the panel sits in-flow as a
   * bottom bar — no backdrop — so canvas pointer events reach the crop overlay
   * and the canvas shrinks above it instead of being covered.
   */
  docked?: boolean;
}

export const ToolPanel: React.FC<ToolPanelProps> = (props) => {
  const { open, title, onClose, children, docked = false } = props;
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const { t } = useTranslation();

  // Store the trigger element when panel opens; restore focus on close
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      // Announce the dialog without implying that Close is the primary action.
      requestAnimationFrame(() => {
        panelRef.current?.focus({ preventScroll: true });
      });
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus({ preventScroll: true });
      triggerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — narrow only. Docked tools (crop) stay non-modal so the
          canvas below remains interactive. */}
      {!docked && (
        <div
          className="absolute inset-0 bg-black/40 z-30 @xl/editor:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={docked ? undefined : "true"}
        aria-label={title ?? t("a11y.toolOptions")}
        data-text-toolbar
        className={cn(
          docked
            ? // Narrow: in-flow bottom bar — no backdrop, canvas shrinks above it
              "relative w-full shrink-0 order-first z-40"
            : // Narrow: modal bottom sheet — slides up from bottom
              "absolute bottom-0 left-0 right-0 z-40",
          "bg-card rounded-t-xl flex flex-col outline-none",
          docked ? "max-h-[42vh]" : "max-h-[60vh]",
          "animate-in slide-in-from-bottom duration-200",
          // Fluid type steps — grow panel text as the editor widens
          "@3xl/editor:[--text-fluid-size:0.75rem]",
          "@5xl/editor:[--text-fluid-size:0.8125rem]",
          "@7xl/editor:[--text-fluid-size:0.875rem]",
          // Wide: side panel — slides in from left
          "@xl/editor:relative @xl/editor:bottom-auto @xl/editor:left-auto @xl/editor:right-auto",
          "@xl/editor:z-auto @xl/editor:rounded-none @xl/editor:max-h-none @xl/editor:order-none",
          "@xl/editor:w-60 @3xl/editor:w-75 @xl/editor:shrink-0",
          "@xl/editor:border-r @xl/editor:border-border",
          "@xl/editor:[--tw-enter-translate-y:0] @xl/editor:slide-in-from-left-4",
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between h-9 px-3 border-b border-border @5xl/editor:h-10">
            {/* Narrow: drag handle + title */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30 @xl/editor:hidden" />
              <span className="text-fluid font-medium">{title}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 @5xl/editor:h-7 @5xl/editor:w-7"
              onClick={onClose}
              aria-label={t("panel.close")}
            >
              <X className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          <div className="@container/panel p-(--pad-fluid)">{children}</div>
        </ScrollArea>
      </aside>
    </>
  );
};
