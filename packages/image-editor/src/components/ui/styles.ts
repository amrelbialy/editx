/**
 * Shared style tokens for the UI primitives.
 *
 * Keep this file dependency-free (only plain class strings) so the whole
 * `ui/` folder stays portable and can be extracted into a standalone
 * package later. Compose with `cn` at the call site.
 */

/** Beautiful, consistent focus ring: soft 3px halo + 2px offset gap. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Same ring, applied when a child element is focused (wrapper inputs). */
export const focusWithinRing =
  "focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/50 " +
  "focus-within:ring-offset-2 focus-within:ring-offset-background";

/** Canonical surface for text-like controls (input, select, color, number). */
export const controlBase =
  "h-8 rounded-md border border-border bg-muted px-2 text-sm text-foreground " +
  "transition-colors placeholder:text-muted-foreground " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/** Base behavior for any custom interactive element built on a raw tag. */
export const interactiveBase =
  "cursor-pointer transition-colors disabled:pointer-events-none disabled:opacity-50";
