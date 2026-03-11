import type { TextRun, TextRunStyle } from './block.types';

/**
 * Pure utility functions for manipulating TextRun arrays.
 * All functions return new arrays — no mutation of inputs.
 */

/** Computes start/end indices for each run. */
export function getRunIndices(runs: TextRun[]): { start: number; end: number }[] {
  const result: { start: number; end: number }[] = [];
  let offset = 0;
  for (const run of runs) {
    result.push({ start: offset, end: offset + run.text.length });
    offset += run.text.length;
  }
  return result;
}

/** Returns the plain text represented by the runs. */
export function getPlainText(runs: TextRun[]): string {
  return runs.map((r) => r.text).join('');
}

/** IMP-2: Merge adjacent runs that have identical styles. */
export function mergeAdjacentRuns(runs: TextRun[]): TextRun[] {
  if (runs.length === 0) return [];
  const result: TextRun[] = [{ text: runs[0].text, style: { ...runs[0].style } }];

  for (let i = 1; i < runs.length; i++) {
    const prev = result[result.length - 1];
    if (stylesEqual(prev.style, runs[i].style)) {
      prev.text += runs[i].text;
    } else {
      result.push({ text: runs[i].text, style: { ...runs[i].style } });
    }
  }

  // Filter out empty-text runs
  return result.filter((r) => r.text.length > 0);
}

/** Checks if two TextRunStyle objects are equal. */
export function stylesEqual(a: TextRunStyle, b: TextRunStyle): boolean {
  return (
    (a.fontSize ?? undefined) === (b.fontSize ?? undefined) &&
    (a.fontFamily ?? undefined) === (b.fontFamily ?? undefined) &&
    (a.fontWeight ?? undefined) === (b.fontWeight ?? undefined) &&
    (a.fontStyle ?? undefined) === (b.fontStyle ?? undefined) &&
    (a.fill ?? undefined) === (b.fill ?? undefined) &&
    (a.letterSpacing ?? undefined) === (b.letterSpacing ?? undefined) &&
    (a.textDecoration ?? undefined) === (b.textDecoration ?? undefined)
  );
}

/**
 * Split runs at character boundaries `start` and `end` so that the range
 * [start, end) is fully covered by complete runs.
 * Returns a new array of runs with the splits applied.
 */
export function splitRunsAtBoundaries(runs: TextRun[], start: number, end: number): TextRun[] {
  const result: TextRun[] = [];
  let offset = 0;

  for (const run of runs) {
    const runStart = offset;
    const runEnd = offset + run.text.length;

    // Collect split points within this run
    const splitPoints: number[] = [];
    if (start > runStart && start < runEnd) splitPoints.push(start - runStart);
    if (end > runStart && end < runEnd) splitPoints.push(end - runStart);

    if (splitPoints.length === 0) {
      result.push({ text: run.text, style: { ...run.style } });
    } else {
      let prev = 0;
      for (const sp of splitPoints) {
        if (sp > prev) {
          result.push({ text: run.text.slice(prev, sp), style: { ...run.style } });
        }
        prev = sp;
      }
      if (prev < run.text.length) {
        result.push({ text: run.text.slice(prev), style: { ...run.style } });
      }
    }

    offset = runEnd;
  }

  return result;
}

/**
 * Apply a partial style update to all characters in [start, end).
 * Splits runs at boundaries, applies the style, then merges adjacent.
 */
export function setStyleOnRange(
  runs: TextRun[],
  start: number,
  end: number,
  styleUpdate: Partial<TextRunStyle>,
): TextRun[] {
  if (start >= end) return runs.map((r) => ({ text: r.text, style: { ...r.style } }));

  const split = splitRunsAtBoundaries(runs, start, end);
  let offset = 0;

  for (const run of split) {
    const runStart = offset;
    const runEnd = offset + run.text.length;

    // If this run overlaps [start, end), apply the style
    if (runStart >= start && runEnd <= end) {
      Object.assign(run.style, styleUpdate);
    }

    offset = runEnd;
  }

  return mergeAdjacentRuns(split);
}

/**
 * Remove characters in [start, end) from the runs.
 * Returns merged result.
 */
export function removeRange(runs: TextRun[], start: number, end: number): TextRun[] {
  if (start >= end) return runs.map((r) => ({ text: r.text, style: { ...r.style } }));

  const result: TextRun[] = [];
  let offset = 0;

  for (const run of runs) {
    const runStart = offset;
    const runEnd = offset + run.text.length;

    if (runEnd <= start || runStart >= end) {
      // Entirely outside the removal range
      result.push({ text: run.text, style: { ...run.style } });
    } else {
      // Partially or fully within the removal range
      let kept = '';
      if (runStart < start) {
        kept += run.text.slice(0, start - runStart);
      }
      if (runEnd > end) {
        kept += run.text.slice(end - runStart);
      }
      if (kept.length > 0) {
        result.push({ text: kept, style: { ...run.style } });
      }
    }

    offset = runEnd;
  }

  return mergeAdjacentRuns(result);
}

/**
 * Insert text at `position`, inheriting the style of the run at that position.
 * Returns merged result.
 */
export function insertText(runs: TextRun[], position: number, text: string): TextRun[] {
  if (text.length === 0) return runs.map((r) => ({ text: r.text, style: { ...r.style } }));

  const result: TextRun[] = [];
  let offset = 0;
  let inserted = false;

  for (const run of runs) {
    const runStart = offset;
    const runEnd = offset + run.text.length;

    if (!inserted && position >= runStart && position <= runEnd) {
      // Insert within this run
      const splitAt = position - runStart;
      const before = run.text.slice(0, splitAt);
      const after = run.text.slice(splitAt);

      if (before.length > 0) {
        result.push({ text: before, style: { ...run.style } });
      }
      result.push({ text, style: { ...run.style } });
      if (after.length > 0) {
        result.push({ text: after, style: { ...run.style } });
      }
      inserted = true;
    } else {
      result.push({ text: run.text, style: { ...run.style } });
    }

    offset = runEnd;
  }

  // If position is at the very end (past all runs)
  if (!inserted) {
    const lastStyle = runs.length > 0 ? { ...runs[runs.length - 1].style } : {};
    result.push({ text, style: lastStyle });
  }

  return mergeAdjacentRuns(result);
}

/**
 * Replace text in [start, end) with new text, inheriting the style at `start`.
 * Equivalent to removeRange + insertText but more efficient.
 */
export function replaceRange(
  runs: TextRun[],
  start: number,
  end: number,
  newText: string,
): TextRun[] {
  const afterRemove = removeRange(runs, start, end);
  return insertText(afterRemove, start, newText);
}
