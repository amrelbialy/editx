/**
 * Soft dark halo that keeps light text readable over light photos. Values are
 * relative to the 24px reference font size and scale with the canvas.
 */
export const onPhotoShadow = {
  textShadowColor: "#000000",
  textShadowBlur: 4,
  textShadowOffsetX: 0,
  textShadowOffsetY: 1,
} as const;
