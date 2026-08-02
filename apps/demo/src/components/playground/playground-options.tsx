import {
  Crop,
  Download,
  Globe,
  Image as ImageIcon,
  Layout,
  Palette,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Type,
  Wrench,
} from "lucide-react";
import { CollapsibleSection } from "./controls";
import type { ConfigUpdater, PlaygroundConfig } from "./playground.types";
import { countChanged } from "./section-diff";
import {
  AdjustSection,
  CropSection,
  ExportSection,
  FilterSection,
  ImageSection,
  ImageSourceSection,
  LocaleSection,
  ShapesSection,
  TextSection,
  ThemeSection,
  ToolsSection,
  UISection,
} from "./sections";

interface Props {
  config: PlaygroundConfig;
  onConfigChange: ConfigUpdater;
  onImageChange: (src: string | File) => void;
}

type Keys = readonly (keyof PlaygroundConfig)[];

export function PlaygroundOptions(props: Props) {
  const { config, onConfigChange, onImageChange } = props;

  const badge = (keys: Keys) => countChanged(config, keys);
  const section = { config, onConfigChange };

  return (
    <div className="flex flex-col">
      <CollapsibleSection icon={ImageIcon} title="Image Source" defaultOpen>
        <ImageSourceSection onImageChange={onImageChange} />
      </CollapsibleSection>

      <CollapsibleSection
        icon={Palette}
        title="Theme"
        defaultOpen
        activeCount={badge(["themePreset", "borderRadius", "fontFamily", "colors"])}
      >
        <ThemeSection {...section} />
      </CollapsibleSection>

      <CollapsibleSection icon={Wrench} title="Tools" activeCount={badge(["tools", "defaultTool"])}>
        <ToolsSection {...section} />
      </CollapsibleSection>

      <CollapsibleSection
        icon={Layout}
        title="UI & Chrome"
        activeCount={badge([
          "title",
          "showTitle",
          "unsavedChangesWarning",
          "showCloseButton",
          "showBackButton",
          "compactSidebar",
          "groupSeparators",
        ])}
      >
        <UISection {...section} />
      </CollapsibleSection>

      <CollapsibleSection
        icon={Crop}
        title="Crop"
        activeCount={badge([
          "cropAspectPresets",
          "cropResizeGroups",
          "cropAllowCustomRatio",
          "cropShowRotateFlip",
        ])}
      >
        <CropSection {...section} />
      </CollapsibleSection>

      <CollapsibleSection
        icon={SlidersHorizontal}
        title="Adjust"
        activeCount={badge(["adjustControls"])}
      >
        <AdjustSection {...section} />
      </CollapsibleSection>

      <CollapsibleSection icon={Sparkles} title="Filter" activeCount={badge(["filterPresets"])}>
        <FilterSection {...section} />
      </CollapsibleSection>

      <CollapsibleSection
        icon={Type}
        title="Text"
        activeCount={badge([
          "textDefaultFontSize",
          "textDefaultColor",
          "textDefaultFontStyle",
          "textDefaultTextAlign",
          "textDefaultLineHeight",
          "textDefaultLetterSpacing",
          "textMinFontSize",
          "textMaxFontSize",
        ])}
      >
        <TextSection {...section} />
      </CollapsibleSection>

      <CollapsibleSection
        icon={Shapes}
        title="Shapes"
        activeCount={badge([
          "shapesPresets",
          "shapesDefaultFillMode",
          "shapesDefaultColor",
          "shapesDefaultStrokeColor",
          "shapesDefaultStrokeWidth",
          "shapesDefaultOpacity",
          "shapesDefaultCornerRadius",
          "shapesDefaultSize",
        ])}
      >
        <ShapesSection {...section} />
      </CollapsibleSection>

      <CollapsibleSection
        icon={ImageIcon}
        title="Image Upload"
        activeCount={badge(["imageMaxFileSize", "imageMaxDimension"])}
      >
        <ImageSection {...section} />
      </CollapsibleSection>

      <CollapsibleSection
        icon={Download}
        title="Export"
        activeCount={badge([
          "exportFormats",
          "exportFormat",
          "exportQuality",
          "exportCloseAfterSave",
          "exportFilename",
        ])}
      >
        <ExportSection {...section} />
      </CollapsibleSection>

      <CollapsibleSection icon={Globe} title="Locale" activeCount={badge(["locale"])}>
        <LocaleSection {...section} />
      </CollapsibleSection>
    </div>
  );
}
