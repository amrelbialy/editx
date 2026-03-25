import { AlignLeft, Heading, Heading1, Type } from "lucide-react";
import type React from "react";
import type { TextPreset } from "../../hooks/use-text-tool";
import { Section } from "../ui/section";
import type { SelectionGridItem } from "../ui/selection-grid";
import { SelectionGrid } from "../ui/selection-grid";

export interface TextPanelProps {
  onAddText: (preset: TextPreset) => void;
}

const TEXT_PRESETS: Array<SelectionGridItem & { preset: TextPreset }> = [
  { id: "title", preset: "title", label: "Title", icon: <Heading1 className="h-5 w-5" /> },
  { id: "heading", preset: "heading", label: "Heading", icon: <Heading className="h-5 w-5" /> },
  {
    id: "subheading",
    preset: "subheading",
    label: "Subheading",
    icon: <Type className="h-5 w-5" />,
  },
  { id: "body", preset: "body", label: "Body Text", icon: <AlignLeft className="h-5 w-5" /> },
];

export const TextPanel: React.FC<TextPanelProps> = ({ onAddText }) => {
  const handleSelect = (id: string) => {
    const item = TEXT_PRESETS.find((p) => p.id === id);
    if (item) onAddText(item.preset);
  };

  return (
    <Section label="Add Text">
      <SelectionGrid
        items={TEXT_PRESETS}
        onSelect={handleSelect}
        columns={2}
        ariaLabel="Text presets"
      />
    </Section>
  );
};
