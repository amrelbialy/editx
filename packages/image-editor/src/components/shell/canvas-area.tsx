import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";

interface CanvasAreaProps {
  /** Ref passed to the container div where Konva mounts */
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** Content rendered above the canvas (e.g. block properties bar) */
  header?: React.ReactNode;
  /** Absolutely-positioned overlay rendered inside the canvas region (e.g. floating action bar) */
  overlay?: React.ReactNode;
  children?: React.ReactNode;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({ canvasRef, header, overlay, children }) => {
  const { t } = useTranslation();

  return (
    <section
      className={cn("relative flex flex-col flex-1 min-w-0 overflow-hidden")}
      aria-label={t("a11y.canvas")}
    >
      {header && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-1rem)]">
          {header}
        </div>
      )}
      <div ref={canvasRef} className="relative flex-1 min-h-0" />
      {overlay}
      {children}
    </section>
  );
};
