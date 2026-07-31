import { AlignLeft, Heading, Heading1, Type } from "lucide-react";
import type React from "react";
import { useConfig } from "../../config/config-context";
import type { TextPreset } from "../../hooks/use-text-tool";
import { Section } from "../ui/section";
import type { SelectionGridItem } from "../ui/selection-grid";
import { SelectionGrid } from "../ui/selection-grid";

export interface TextPanelProps {
  onAddText: (preset: TextPreset) => void;
}

/** Icons keyed by the built-in preset ids, with a generic fallback. */
const PRESET_ICONS: Record<string, React.ReactNode> = {
  title: <Heading1 className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  heading: <Heading className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  subheading: <Type className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  body: <AlignLeft className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
};

const FALLBACK_ICON = <Type className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />;

export const TextPanel: React.FC<TextPanelProps> = ({ onAddText }) => {
  const config = useConfig();

  const presets = config.text?.presets ?? [];
  const items: SelectionGridItem[] = presets.map((p) => ({
    id: p.id,
    label: p.label,
    icon: PRESET_ICONS[p.id] ?? FALLBACK_ICON,
  }));

  return (
    <Section label="Text styles">
      <SelectionGrid
        items={items}
        onSelect={(id) => onAddText(id)}
        columns={2}
        ariaLabel="Text presets"
      />
    </Section>
  );
};
