import { FolderOpen, Save } from "lucide-react";
import type React from "react";
import { useRef } from "react";
import { useProjectFile } from "../../hooks/use-project-file";
import { useTranslation } from "../../i18n/i18n-context";
import type { ProjectEngineRef } from "../../utils/project-file";
import { IconButton, Input } from "../ui";
import { DiscardConfirmationDialog } from "./discard-confirmation-dialog";

interface ProjectFileActionsProps {
  engineRef: ProjectEngineRef;
  filename?: string;
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
}

export const ProjectFileActions: React.FC<ProjectFileActionsProps> = (props) => {
  const { engineRef, filename, disabled, onBusyChange } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  const { t } = useTranslation();
  const project = useProjectFile({ engineRef, filename, onBusyChange });

  const unavailable = disabled || project.busy || !!project.pending || !engineRef.current;

  return (
    <>
      <div className="flex items-center gap-1.5" aria-busy={project.busy}>
        <IconButton
          label={t("project.open")}
          icon={<FolderOpen className="h-4 w-4" />}
          disabled={unavailable}
          onClick={() => inputRef.current?.click()}
        />
        <IconButton
          label={t("project.save")}
          tooltip={`${t("project.save")}. ${t("project.portability")}`}
          icon={<Save className="h-4 w-4" />}
          disabled={unavailable}
          onClick={() => void project.save()}
        />
      </div>
      <Input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".editx,application/vnd.editx+zip"
        aria-label={t("project.fileInput")}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void project.open(file);
        }}
      />
      <DiscardConfirmationDialog
        open={!!project.pending}
        description={t("project.discardDescription")}
        onDiscard={project.confirmOpen}
        onCancel={project.cancelOpen}
      />
    </>
  );
};
