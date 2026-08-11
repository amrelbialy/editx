/**
 * Security allowlist for SVG path `d` strings.
 *
 * Konva consumes only the `d` string (it never injects raw SVG markup into the
 * DOM), so the sole attack surface is the character set of the path data. This
 * strict allowlist admits path commands, numbers (incl. exponents, decimals,
 * signs) and separators, and rejects any markup / URL / script vectors such as
 * `<`, `(`, `:` or `#`.
 */
const SVG_PATH_DATA_PATTERN = /^[MmLlHhVvCcSsQqTtAaZz0-9\s,.\-+eE]*$/;

/**
 * Validate an SVG path `d` string against {@link SVG_PATH_DATA_PATTERN}.
 * Fail-fast: throws on any disallowed character rather than silently stripping.
 *
 * @returns the validated `d` string (unchanged) for convenient inline use.
 * @throws {Error} `"Invalid SVG path data"` when a disallowed character is found.
 */
export function validateSvgPathData(data: string): string {
  if (!SVG_PATH_DATA_PATTERN.test(data)) {
    throw new Error("Invalid SVG path data");
  }
  return data;
}
