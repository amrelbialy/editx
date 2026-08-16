const FALLBACK_COLOR = "#000000";
const CHANNEL_PATTERN = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)%?$/;

const toHexChannel = (channel: string): string | null => {
  if (!CHANNEL_PATTERN.test(channel)) {
    return null;
  }

  const isPercentage = channel.endsWith("%");
  const value = Number.parseFloat(channel);

  if (!Number.isFinite(value)) {
    return null;
  }

  const scaled = isPercentage ? (value / 100) * 255 : value;
  return Math.round(Math.min(255, Math.max(0, scaled)))
    .toString(16)
    .padStart(2, "0");
};

export const toOpaqueHexColor = (color: string): string => {
  const normalized = color.trim().toLowerCase();

  if (normalized === "transparent") {
    return FALLBACK_COLOR;
  }

  const shorthandHexMatch = normalized.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])(?:[0-9a-f])?$/);
  if (shorthandHexMatch) {
    const [, red, green, blue] = shorthandHexMatch;
    return `#${red}${red}${green}${green}${blue}${blue}`;
  }

  const hexMatch = normalized.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/);
  if (hexMatch) {
    return `#${hexMatch[1]}`;
  }

  const rgbMatch = normalized.match(/^(rgb|rgba)\((.*)\)$/);
  if (!rgbMatch) {
    return FALLBACK_COLOR;
  }

  const channels = rgbMatch[2].split(",").map((channel) => channel.trim());
  const expectedChannels = rgbMatch[1] === "rgba" ? 4 : 3;
  if (channels.length !== expectedChannels) {
    return FALLBACK_COLOR;
  }

  const hexChannels = channels.slice(0, 3).map(toHexChannel);
  const alpha = channels[3];
  if (hexChannels.includes(null) || (alpha !== undefined && !CHANNEL_PATTERN.test(alpha))) {
    return FALLBACK_COLOR;
  }

  return `#${hexChannels.join("")}`;
};
