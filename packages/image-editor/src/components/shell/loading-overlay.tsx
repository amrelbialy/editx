import type React from "react";
import { Spinner } from "../ui/spinner";

export const LoadingOverlay: React.FC = () => {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-3"
      role="status"
    >
      <Spinner size="lg" />
      <span className="text-muted-foreground text-sm">Loading image...</span>
    </div>
  );
};
