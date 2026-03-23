/**
 * GPU-accelerated image filter renderer using WebGL2.
 *
 * Applies all 12 adjustments + preset color grading in a single
 * fragment-shader draw call on a hidden offscreen canvas.
 * The result is fed to Konva.Image.image() — no Konva cache() needed.
 */

import { PRESET_UNIFORMS } from "./webgl-preset-data";

// ────────────────────────────────────────────────────────
// Public types
// ────────────────────────────────────────────────────────

export interface FilterParams {
  brightness: number; // -1..1
  contrast: number; // -1..1
  saturation: number; // -1..1
  gamma: number; // -1..1
  exposure: number; // -1..1
  temperature: number; // -1..1
  shadows: number; // -1..1
  highlights: number; // -1..1
  blacks: number; // -1..1
  whites: number; // -1..1
  clarity: number; // -1..1
  sharpness: number; // 0..100
  preset: string; // preset name or '' for none
}

// ────────────────────────────────────────────────────────
// GLSL sources
// ────────────────────────────────────────────────────────

const VERTEX_SRC = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;
void main() {
  // Map [-1,1] clip space to [0,1] texture coords, flip Y for image orientation
  vec2 uv = a_position * 0.5 + 0.5;
  v_texCoord = vec2(uv.x, 1.0 - uv.y);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `#version 300 es
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

// ── Preset uniforms ──
uniform float u_presetBrightness;
uniform float u_presetContrast;
uniform float u_presetSaturation;
uniform float u_presetSepia;
uniform float u_presetGrayscale;
uniform vec3  u_presetRGB;        // multiplicative, default (1,1,1)
uniform vec4  u_presetColorFilter; // (r,g,b,a) in 0..1 range

// ── Preset special modes ──
uniform float u_presetInvert;      // 0 or 1
uniform float u_presetSolarize;    // 0 or 1
uniform float u_presetBlackWhite;  // 0 or 1

vec3 applyBrightness(vec3 c, float val) {
  return c + val;
}

vec3 applyContrast(vec3 c, float val) {
  // Match Konva: contrast attr is -100..100, we receive -1..1
  // Konva formula: 0.5 * (255 / (128 - contrast*128) - 1) mapped to 0..1
  // Simplified: just use a standard contrast formula
  return (c - 0.5) * (1.0 + val) + 0.5;
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

void main() {
  vec2 texelSize = 1.0 / u_texSize;
  vec4 pixel = texture(u_image, v_texCoord);
  vec3 color = pixel.rgb;

  // ── Spatial filters first (need original neighbours) ──
  color = applySharpness(color, u_sharpness, v_texCoord, texelSize);
  color = applyClarity(color, u_clarity, v_texCoord, texelSize);

  // ── Per-pixel adjustments ──
  if (u_brightness != 0.0) color = applyBrightness(color, u_brightness);
  if (u_contrast != 0.0)   color = applyContrast(color, u_contrast);
  if (u_saturation != 0.0) color = applySaturation(color, u_saturation);
  if (u_gamma != 0.0)      color = applyGamma(color, u_gamma);
  if (u_exposure != 0.0)   color = applyExposure(color, u_exposure);
  if (u_temperature != 0.0) color = applyTemperature(color, u_temperature);
  if (u_highlights != 0.0 || u_shadows != 0.0)
    color = applyHighlightsShadows(color, u_highlights, u_shadows);
  if (u_blacks != 0.0) color = applyBlacks(color, u_blacks);
  if (u_whites != 0.0) color = applyWhites(color, u_whites);

  // ── Preset effects (applied after adjustments, matches CPU order) ──
  // Special presets
  if (u_presetInvert > 0.5)     color = 1.0 - color;
  if (u_presetBlackWhite > 0.5) {
    float avg = (color.r + color.g + color.b) / 3.0;
    color = avg > (100.0 / 255.0) ? vec3(1.0) : vec3(0.0);
  }
  if (u_presetSolarize > 0.5) {
    color = mix(color, 1.0 - color, step(0.5, color));
  }

  // Standard preset ops
  if (u_presetGrayscale > 0.5)   color = applyGrayscale(color);
  if (u_presetSepia > 0.0)       color = applySepia(color, u_presetSepia);
  if (u_presetBrightness != 0.0) color = applyBrightness(color, u_presetBrightness);
  if (u_presetContrast != 0.0)   color = applyContrast(color, u_presetContrast);
  if (u_presetSaturation != 0.0) color = applySaturation(color, u_presetSaturation);
  if (u_presetRGB != vec3(1.0))  color *= u_presetRGB;
  if (u_presetColorFilter.a > 0.0) color = applyColorFilter(color, u_presetColorFilter);

  color = clamp(color, 0.0, 1.0);
  fragColor = vec4(color, pixel.a);
}
`;

// ────────────────────────────────────────────────────────
// WebGLFilterRenderer
// ────────────────────────────────────────────────────────

/** Enable to log per-call timing to the console. Set via window.__CE_PERF = true */
function perfEnabled(): boolean {
  return typeof window !== "undefined" && (window as any).__CE_PERF === true;
}

export class WebGLFilterRenderer {
  #canvas: HTMLCanvasElement;
  #gl: WebGL2RenderingContext;
  #program: WebGLProgram;
  #texture: WebGLTexture | null = null;
  #vao: WebGLVertexArrayObject;
  #uniformLocations: Map<string, WebGLUniformLocation> = new Map();
  #currentWidth = 0;
  #currentHeight = 0;
  #uploadedSource: TexImageSource | null = null;

  constructor() {
    this.#canvas = document.createElement("canvas");
    const gl = this.#canvas.getContext("webgl2", {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL2 not available");
    this.#gl = gl;

    // Compile shaders & link program
    this.#program = this.#createProgram(VERTEX_SRC, FRAGMENT_SRC);

    // Full-screen quad VAO
    this.#vao = this.#createQuadVAO();

    // Cache all uniform locations
    this.#cacheUniformLocations();
  }

  /** Returns true if WebGL2 is available in the current browser. */
  static isSupported(): boolean {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2");
      if (gl) {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      return !!gl;
    } catch {
      return false;
    }
  }

  /** Upload or re-upload the source image as a GPU texture. Skips if same source already uploaded. */
  uploadImage(source: TexImageSource, width: number, height: number): void {
    // Skip if this exact source object is already uploaded
    if (
      this.#uploadedSource === source &&
      this.#currentWidth === width &&
      this.#currentHeight === height
    ) {
      if (perfEnabled()) console.log("[perf:webgl] uploadImage SKIPPED (cached)");
      return;
    }

    const t0 = perfEnabled() ? performance.now() : 0;
    const gl = this.#gl;

    // Resize canvas to match image
    if (this.#currentWidth !== width || this.#currentHeight !== height) {
      this.#canvas.width = width;
      this.#canvas.height = height;
      gl.viewport(0, 0, width, height);
      this.#currentWidth = width;
      this.#currentHeight = height;
    }

    // Create or re-use texture
    if (!this.#texture) {
      this.#texture = gl.createTexture();
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    this.#uploadedSource = source;
    if (perfEnabled())
      console.log(
        `[perf:webgl] uploadImage ${width}×${height}: ${(performance.now() - t0).toFixed(2)}ms`,
      );
  }

  /** Render with the given filter parameters. Returns the canvas element. */
  render(params: FilterParams): HTMLCanvasElement {
    const t0 = perfEnabled() ? performance.now() : 0;
    const gl = this.#gl;

    gl.useProgram(this.#program);
    gl.bindVertexArray(this.#vao);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#texture);
    this.#setUniform1i("u_image", 0);
    this.#setUniform2f("u_texSize", this.#currentWidth, this.#currentHeight);

    // Set adjustment uniforms
    this.#setUniform1f("u_brightness", params.brightness);
    this.#setUniform1f("u_contrast", params.contrast);
    this.#setUniform1f("u_saturation", params.saturation);
    this.#setUniform1f("u_gamma", params.gamma);
    this.#setUniform1f("u_exposure", params.exposure);
    this.#setUniform1f("u_temperature", params.temperature);
    this.#setUniform1f("u_shadows", params.shadows);
    this.#setUniform1f("u_highlights", params.highlights);
    this.#setUniform1f("u_blacks", params.blacks);
    this.#setUniform1f("u_whites", params.whites);
    this.#setUniform1f("u_clarity", params.clarity);
    this.#setUniform1f("u_sharpness", params.sharpness);

    // Set preset uniforms
    this.#applyPresetUniforms(params.preset);

    // Draw full-screen quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // gl.finish() would force GPU sync — only enable for accurate timing
    if (perfEnabled()) {
      gl.finish(); // force GPU to complete so timing is accurate
      console.log(
        `[perf:webgl] render (${this.#currentWidth}×${this.#currentHeight}): ${(performance.now() - t0).toFixed(2)}ms`,
      );
    }

    return this.#canvas;
  }

  /** Release all GPU resources. */
  dispose(): void {
    const gl = this.#gl;
    if (this.#texture) {
      gl.deleteTexture(this.#texture);
      this.#texture = null;
    }
    this.#uploadedSource = null;
    gl.deleteVertexArray(this.#vao);
    gl.deleteProgram(this.#program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  // ──────────── private helpers ────────────

  #createProgram(vsSrc: string, fsSrc: string): WebGLProgram {
    const gl = this.#gl;
    const vs = this.#compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this.#compileShader(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error(`Shader link error: ${info}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  #compileShader(type: number, source: string): WebGLShader {
    const gl = this.#gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  #createQuadVAO(): WebGLVertexArrayObject {
    const gl = this.#gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // Full-screen quad: two triangles as a triangle strip
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(this.#program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    return vao;
  }

  #cacheUniformLocations(): void {
    const gl = this.#gl;
    const prog = this.#program;
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(prog, i);
      if (info) {
        const loc = gl.getUniformLocation(prog, info.name);
        if (loc) this.#uniformLocations.set(info.name, loc);
      }
    }
  }

  #setUniform1f(name: string, value: number): void {
    const loc = this.#uniformLocations.get(name);
    if (loc) this.#gl.uniform1f(loc, value);
  }

  #setUniform1i(name: string, value: number): void {
    const loc = this.#uniformLocations.get(name);
    if (loc) this.#gl.uniform1i(loc, value);
  }

  #setUniform2f(name: string, x: number, y: number): void {
    const loc = this.#uniformLocations.get(name);
    if (loc) this.#gl.uniform2f(loc, x, y);
  }

  #setUniform3f(name: string, x: number, y: number, z: number): void {
    const loc = this.#uniformLocations.get(name);
    if (loc) this.#gl.uniform3f(loc, x, y, z);
  }

  #setUniform4f(name: string, x: number, y: number, z: number, w: number): void {
    const loc = this.#uniformLocations.get(name);
    if (loc) this.#gl.uniform4f(loc, x, y, z, w);
  }

  #applyPresetUniforms(presetName: string): void {
    if (!presetName) {
      // Reset all preset uniforms to defaults
      this.#setUniform1f("u_presetBrightness", 0);
      this.#setUniform1f("u_presetContrast", 0);
      this.#setUniform1f("u_presetSaturation", 0);
      this.#setUniform1f("u_presetSepia", 0);
      this.#setUniform1f("u_presetGrayscale", 0);
      this.#setUniform3f("u_presetRGB", 1, 1, 1);
      this.#setUniform4f("u_presetColorFilter", 0, 0, 0, 0);
      this.#setUniform1f("u_presetInvert", 0);
      this.#setUniform1f("u_presetSolarize", 0);
      this.#setUniform1f("u_presetBlackWhite", 0);
      return;
    }

    const preset = PRESET_UNIFORMS.get(presetName);
    if (!preset) {
      // Unknown preset — clear
      this.#applyPresetUniforms("");
      return;
    }

    this.#setUniform1f("u_presetBrightness", preset.brightness);
    this.#setUniform1f("u_presetContrast", preset.contrast);
    this.#setUniform1f("u_presetSaturation", preset.saturation);
    this.#setUniform1f("u_presetSepia", preset.sepia);
    this.#setUniform1f("u_presetGrayscale", preset.grayscale);
    this.#setUniform3f("u_presetRGB", preset.rgb[0], preset.rgb[1], preset.rgb[2]);
    this.#setUniform4f(
      "u_presetColorFilter",
      preset.colorFilter[0],
      preset.colorFilter[1],
      preset.colorFilter[2],
      preset.colorFilter[3],
    );
    this.#setUniform1f("u_presetInvert", preset.invert);
    this.#setUniform1f("u_presetSolarize", preset.solarize);
    this.#setUniform1f("u_presetBlackWhite", preset.blackWhite);
  }
}
