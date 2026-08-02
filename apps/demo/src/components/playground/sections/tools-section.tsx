import { CheckList, SelectField } from "../controls";
import { ALL_TOOLS } from "../playground.constants";
import type { SectionProps } from "../playground.types";

const TOOL_OPTIONS = ALL_TOOLS.map((t) => ({
  label: t.charAt(0).toUpperCase() + t.slice(1),
  value: t,
}));

export function ToolsSection(props: SectionProps) {
  const { config, onConfigChange } = props;

  const toggleTool = (tool: string) => {
    const next = config.tools.includes(tool)
      ? config.tools.filter((t) => t !== tool)
      : [...config.tools, tool];
    onConfigChange("tools", next);
    if (config.defaultTool && !next.includes(config.defaultTool)) {
      onConfigChange("defaultTool", "");
    }
  };

  const defaultToolOptions = [
    { label: "None", value: "" },
    ...TOOL_OPTIONS.filter((o) => config.tools.includes(o.value)),
  ];

  return (
    <div className="flex flex-col gap-3">
      <CheckList
        variant="list"
        options={TOOL_OPTIONS}
        selected={config.tools}
        onToggle={toggleTool}
      />
      <SelectField
        label="Default tool"
        value={config.defaultTool}
        options={defaultToolOptions}
        onChange={(v) => onConfigChange("defaultTool", v)}
      />
    </div>
  );
}
