import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { Button } from "../ui/button";

interface ErrorPlaceholderProps {
  error: string;
  onRetry: () => void;
}

export const ErrorPlaceholder: React.FC<ErrorPlaceholderProps> = (props) => {
  const { error, onRetry } = props;
  const { t } = useTranslation();

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-20 gap-4"
      role="alert"
    >
      <div className="text-destructive text-lg font-medium">{t("error.title")}</div>
      <div className="text-muted-foreground text-sm max-w-md text-center">{error}</div>
      <Button size="lg" onClick={onRetry}>
        {t("error.retry")}
      </Button>
    </div>
  );
};
