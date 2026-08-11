import type React from "react";
import type { PresetPreview, PreviewBoxStyle, PreviewStyle } from "../../../config/config.types";

interface PresetThumbnailProps {
  preview: PresetPreview;
}

/**
 * Interprets a serializable {@link PresetPreview} descriptor into inline CSS.
 * App-layer (not `ui/`) because it depends on the config-owned preview shape.
 * Text previews map font / weight / colour / `-webkit-text-stroke` /
 * `text-shadow` and wrap the sample in a block-level background box when the
 * preset has one; shape previews map `border-radius` / `clip-path` / gradients /
 * `background-image` / border.
 */
export const PresetThumbnail: React.FC<PresetThumbnailProps> = (props) => {
  const { preview } = props;

  if (preview.kind === "text") {
    const lines = preview.sample.split("\n");
    const box = preview.style?.box;
    const body = lines.map((line, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static preview sample lines
      <span key={i} className="block truncate text-[13px]">
        {line || "\u00A0"}
      </span>
    ));
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center px-1 text-center leading-tight text-foreground"
        style={toTextStyle(preview.style)}
      >
        {box ? <div style={toBoxStyle(box)}>{body}</div> : body}
      </div>
    );
  }

  return <div className="h-11 w-11" style={toShapeStyle(preview.style)} />;
};

function toBoxStyle(box: PreviewBoxStyle): React.CSSProperties {
  return {
    background: box.background,
    borderRadius: box.borderRadius,
    padding: box.padding,
    boxShadow: box.boxShadow,
    border: box.border,
  };
}

function toTextStyle(style?: PreviewStyle): React.CSSProperties {
  if (!style) return {};
  const css: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    letterSpacing: style.letterSpacing,
    textTransform: style.textTransform as React.CSSProperties["textTransform"],
    WebkitTextStroke: style.textStroke,
    textShadow: style.textShadow,
  };
  if (style.background) {
    css.background = style.background;
    // Match the canvas highlight pill (padX 0.2em, padY 0.1em, radius 0.15em
    // relative to font size) — em keeps it proportional to the sample font.
    css.borderRadius = "0.15em";
    css.padding = "0.1em 0.2em";
  }
  if (style.textGradient) {
    css.background = style.textGradient;
    css.WebkitBackgroundClip = "text";
    css.backgroundClip = "text";
    css.color = "transparent";
  }
  return css;
}

function toShapeStyle(style?: PreviewStyle): React.CSSProperties {
  if (!style) return { background: "currentColor", borderRadius: "4px", opacity: 0.6 };
  return {
    background: style.background,
    backgroundImage: style.backgroundImage,
    backgroundSize: style.backgroundImage ? "cover" : undefined,
    backgroundPosition: style.backgroundImage ? "center" : undefined,
    borderRadius: style.borderRadius,
    clipPath: style.clipPath,
    border: style.border,
  };
}
