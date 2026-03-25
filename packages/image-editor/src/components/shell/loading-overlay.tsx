import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { Spinner } from "../ui/spinner";

export const LoadingOverlay: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-3"
      role="status"
    >
      <Spinner size="lg" label={t("loading.label")} />
      <span className="text-muted-foreground text-sm">{t("loading.image")}</span>
    </div>
  );
};
