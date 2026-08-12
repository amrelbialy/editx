import type React from "react";
import type {
  PresetPreview,
  PreviewBoxStyle,
  PreviewStyle,
  PreviewTextSegment,
} from "../../../config/config.types";

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
    let offset = 0;
    const body = lines.map((line, index) => {
      const start = offset;
      offset += line.length + 1;
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: static preview sample lines
        <span key={index} className="block truncate text-[13px]">
          {renderLine(line, start, preview.style, preview.segments)}
        </span>
      );
    });
    const styledBody = preview.segments?.length ? body : renderTextLayers(body, preview.style);
    return (
      <div className="flex h-full w-full flex-col items-center justify-center px-1 text-center leading-tight text-foreground">
        {box ? <div style={toBoxStyle(box)}>{styledBody}</div> : styledBody}
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

function toGlyphStyle(style?: PreviewStyle): React.CSSProperties {
  if (!style) return {};
  const css: React.CSSProperties = {
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    letterSpacing: style.letterSpacing,
    textDecoration: style.textDecoration,
    textTransform: style.textTransform as React.CSSProperties["textTransform"],
    WebkitTextStroke: style.textStroke,
    textShadow: style.textShadow,
  };
  if (style.textGradient) {
    css.backgroundImage = style.textGradient;
    css.WebkitBackgroundClip = "text";
    css.backgroundClip = "text";
    css.color = "transparent";
  } else if (style.textGradient === null) {
    css.backgroundImage = "none";
    css.WebkitBackgroundClip = "border-box";
    css.backgroundClip = "border-box";
  }
  return css;
}

function toHighlightStyle(style?: PreviewStyle): React.CSSProperties {
  if (!style?.background) return {};
  return {
    background:
      style.backgroundOpacity === undefined
        ? style.background
        : `color-mix(in srgb, ${style.background} ${style.backgroundOpacity * 100}%, transparent)`,
    borderRadius: style.borderRadius ?? "0.15em",
    padding: style.padding ?? "0.1em 0.2em",
  };
}

function renderTextLayers(content: React.ReactNode, style?: PreviewStyle) {
  return (
    <span style={toHighlightStyle(style)}>
      <span data-text-preview-glyph style={toGlyphStyle(style)}>
        {content}
      </span>
    </span>
  );
}

function renderLine(
  line: string,
  lineStart: number,
  baseStyle?: PreviewStyle,
  segments?: PreviewTextSegment[],
) {
  if (!line) return renderTextLayers("\u00A0", baseStyle);
  const lineEnd = lineStart + line.length;
  const boundaries = [
    lineStart,
    ...(segments ?? []).flatMap(({ start, end }) => [start, end]),
    lineEnd,
  ]
    .filter((value) => value >= lineStart && value <= lineEnd)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((left, right) => left - right);
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const segment = segments?.find((candidate) => candidate.start <= start && candidate.end >= end);
    const style = { ...baseStyle, ...segment?.style };
    return (
      <span key={`${start}:${end}`} style={toHighlightStyle(style)}>
        <span data-text-preview-glyph style={toGlyphStyle(style)}>
          {line.slice(start - lineStart, end - lineStart)}
        </span>
      </span>
    );
  });
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
