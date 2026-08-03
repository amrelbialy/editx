import { PRESET_OPCODE_GLSL } from "./filters/presets/preset-opcodes";

/** Vertex shader for full-screen quad. Maps clip-space to texture coords with Y-flip. */
export const VERTEX_SRC = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;
void main() {
  // Map [-1,1] clip space to [0,1] texture coords, flip Y for image orientation
  vec2 uv = a_position * 0.5 + 0.5;
  v_texCoord = vec2(uv.x, 1.0 - uv.y);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Fragment shader that applies all 12 adjustments + preset color grading
 * in a single pass, in the canonical op order shared with the CPU chain.
 *
 * The preset opcode constants below are injected from `preset-opcodes.ts`
 * so the shader and TypeScript can never drift out of sync.
 */
export const FRAGMENT_SRC = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform vec2 u_texSize; // width, height in pixels

// ── Adjustment uniforms ──
uniform float u_brightness;   // -1..1
uniform float u_contrast;     // -1..1
uniform float u_saturation;   // -1..1
uniform float u_gamma;        // -1..1
uniform float u_exposure;     // -1..1
uniform float u_temperature;  // -1..1
uniform float u_shadows;      // -1..1
uniform float u_highlights;   // -1..1
uniform float u_blacks;       // -1..1
uniform float u_whites;       // -1..1
uniform float u_clarity;      // -1..1
uniform float u_sharpness;    // 0..100

// ── Preset op list (shared, ordered — see preset-opcodes.ts) ──
${PRESET_OPCODE_GLSL}
uniform int  u_presetOpCount;
uniform int  u_presetOpTypes[MAX_PRESET_OPS];
uniform vec4 u_presetOpParams[MAX_PRESET_OPS];

vec3 applyBrightness(vec3 c, float val) {
  return c + val;
}

// Canonical contrast: factor = (1+v)^2; out = (c-0.5)*factor + 0.5
vec3 applyContrast(vec3 c, float val) {
  float f = (1.0 + val) * (1.0 + val);
  return (c - 0.5) * f + 0.5;
}

vec3 applySaturation(vec3 c, float val) {
  float lum = dot(c, vec3(0.2989, 0.587, 0.114));
  return mix(vec3(lum), c, 1.0 + val);
}

vec3 applyGamma(vec3 c, float val) {
  float correction = 1.0 / (1.0 + val);
  return pow(max(c, vec3(0.0)), vec3(correction));
}

vec3 applyExposure(vec3 c, float val) {
  return c * pow(2.0, val);
}

vec3 applyTemperature(vec3 c, float val) {
  float shift = val * (40.0 / 255.0);
  c.r += shift;
  c.b -= shift;
  return c;
}

vec3 applyHighlightsShadows(vec3 c, float highlights, float shadows) {
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float hWeight = max(0.0, (lum - 0.5) * 2.0);
  float sWeight = max(0.0, (0.5 - lum) * 2.0);
  float adj = highlights * (128.0 / 255.0) * hWeight + shadows * (128.0 / 255.0) * sWeight;
  return c + adj;
}

vec3 applyBlacks(vec3 c, float val) {
  float shift = val * (64.0 / 255.0);
  vec3 weight = max(vec3(0.0), 1.0 - c / (128.0 / 255.0));
  return c + shift * weight;
}

vec3 applyWhites(vec3 c, float val) {
  float shift = val * (64.0 / 255.0);
  vec3 weight = max(vec3(0.0), (c - 128.0 / 255.0) / (127.0 / 255.0));
  return c + shift * weight;
}

// Sharpness: 3×3 unsharp mask (4-connected neighbours)
vec3 applySharpness(vec3 center, float amount, vec2 texCoord, vec2 texelSize) {
  if (amount == 0.0) return center;
  float strength = amount / 100.0;
  vec3 top    = texture(u_image, texCoord + vec2(0.0, -texelSize.y)).rgb;
  vec3 bottom = texture(u_image, texCoord + vec2(0.0,  texelSize.y)).rgb;
  vec3 left   = texture(u_image, texCoord + vec2(-texelSize.x, 0.0)).rgb;
  vec3 right  = texture(u_image, texCoord + vec2( texelSize.x, 0.0)).rgb;
  vec3 avg = (top + bottom + left + right) * 0.25;
  return center + strength * (center - avg);
}

// Clarity: 5×5 box blur unsharp mask
vec3 applyClarity(vec3 center, float val, vec2 texCoord, vec2 texelSize) {
  if (val == 0.0) return center;
  float strength = val * 0.5;
  vec3 sum = vec3(0.0);
  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      sum += texture(u_image, texCoord + vec2(float(dx), float(dy)) * texelSize).rgb;
    }
  }
  vec3 avg = sum / 25.0;
  return center + strength * (center - avg);
}

// ── Preset effects ──

vec3 applySepia(vec3 c, float amount) {
  float r = c.r;
  float g = c.g;
  float b = c.b;
  vec3 sepia;
  sepia.r = r * (1.0 - 0.607 * amount) + g * 0.769 * amount + b * 0.189 * amount;
  sepia.g = r * 0.349 * amount + g * (1.0 - 0.314 * amount) + b * 0.168 * amount;
  sepia.b = r * 0.272 * amount + g * 0.534 * amount + b * (1.0 - 0.869 * amount);
  return sepia;
}

vec3 applyGrayscale(vec3 c) {
  float gray = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return vec3(gray);
}

vec3 applyColorFilter(vec3 c, vec4 cf) {
  // cf.rgb in 0..1, cf.a is blend amount
  return c - (c - cf.rgb) * cf.a;
}

vec3 applyPresetOp(vec3 color, int type, vec4 p) {
  if (type == OP_BRIGHTNESS)  return applyBrightness(color, p.x);
  if (type == OP_CONTRAST)    return applyContrast(color, p.x);
  if (type == OP_SATURATION)  return applySaturation(color, p.x);
  if (type == OP_SEPIA)       return applySepia(color, p.x);
  if (type == OP_GRAYSCALE)   return applyGrayscale(color);
  if (type == OP_INVERT)      return 1.0 - color;
  if (type == OP_SOLARIZE)    return mix(color, 1.0 - color, step(0.5, color));
  if (type == OP_BLACKWHITE) {
    float avg = (color.r + color.g + color.b) / 3.0;
    return avg > p.x ? vec3(1.0) : vec3(0.0);
  }
  if (type == OP_RGB)         return color * p.rgb;
  if (type == OP_COLORFILTER) return applyColorFilter(color, p);
  return color;
}

void main() {
  vec2 texelSize = 1.0 / u_texSize;
  vec4 pixel = texture(u_image, v_texCoord);
  vec3 color = pixel.rgb;

  // ── Canonical order: spatial first (read original neighbours) ──
  color = applyClarity(color, u_clarity, v_texCoord, texelSize);
  color = applySharpness(color, u_sharpness, v_texCoord, texelSize);

  // ── Per-pixel adjustments ──
  if (u_brightness != 0.0)  color = applyBrightness(color, u_brightness);
  if (u_saturation != 0.0)  color = applySaturation(color, u_saturation);
  if (u_contrast != 0.0)    color = applyContrast(color, u_contrast);
  if (u_gamma != 0.0)       color = applyGamma(color, u_gamma);
  if (u_exposure != 0.0)    color = applyExposure(color, u_exposure);
  if (u_highlights != 0.0 || u_shadows != 0.0)
    color = applyHighlightsShadows(color, u_highlights, u_shadows);
  if (u_blacks != 0.0)      color = applyBlacks(color, u_blacks);
  if (u_whites != 0.0)      color = applyWhites(color, u_whites);
  if (u_temperature != 0.0) color = applyTemperature(color, u_temperature);

  // ── Preset ops (ordered list, applied last) ──
  for (int i = 0; i < MAX_PRESET_OPS; i++) {
    if (i >= u_presetOpCount) break;
    color = applyPresetOp(color, u_presetOpTypes[i], u_presetOpParams[i]);
  }

  color = clamp(color, 0.0, 1.0);
  fragColor = vec4(color, pixel.a);
}
`;
