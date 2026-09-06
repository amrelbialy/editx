import type React from "react";
import { cn } from "../../../utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-sm bg-muted-foreground/15", className)}
      {...rest}
    />
  );
};
