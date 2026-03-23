import type React from "react";
import { cn } from "../../../utils/cn";
import { Separator } from "../separator";
import type { SectionProps } from "./section.types";

export const Section: React.FC<SectionProps> = (props) => {
  const { label, children, separator, className } = props;

  return (
    <>
      {separator && <Separator className="my-1" />}
      <div className={cn("flex flex-col gap-1.5", className)}>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {children}
      </div>
    </>
  );
};
