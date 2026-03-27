/**
 * GPU-accelerated image filter renderer using WebGL2.
 *
 * Applies all 12 adjustments + preset color grading in a single
 * fragment-shader draw call on a hidden offscreen canvas.
 * The result is fed to Konva.Image.image() — no Konva cache() needed.
 */

import { FRAGMENT_SRC, VERTEX_SRC } from "./glsl-filter-shaders";
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
// WebGLFilterRenderer
// ────────────────────────────────────────────────────────

/** Enable to log per-call timing to the console. Set via window.__EX_PERF = true */
function perfEnabled(): boolean {
  return typeof window !== "undefined" && (window as any).__EX_PERF === true;
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
