import { describe, it, expect } from 'vitest';
import {
  getRunIndices,
  getPlainText,
  mergeAdjacentRuns,
  stylesEqual,
  splitRunsAtBoundaries,
  setStyleOnRange,
  removeRange,
  insertText,
  replaceRange,
} from './text-run-utils';
import type { TextRun } from './block.types';

const run = (text: string, fill = '#000'): TextRun => ({
  text,
  style: { fill },
});

describe('text-run-utils', () => {
  // ── getRunIndices ──────────────────────────────────

  describe('getRunIndices', () => {
    it('returns correct start/end for each run', () => {
      const runs = [run('Hello'), run(' '), run('World')];
      expect(getRunIndices(runs)).toEqual([
        { start: 0, end: 5 },
        { start: 5, end: 6 },
        { start: 6, end: 11 },
      ]);
    });

    it('returns empty array for no runs', () => {
      expect(getRunIndices([])).toEqual([]);
    });
  });

  // ── getPlainText ───────────────────────────────────

  describe('getPlainText', () => {
    it('concatenates all run texts', () => {
      expect(getPlainText([run('Hello'), run(' World')])).toBe('Hello World');
    });

    it('returns empty string for no runs', () => {
      expect(getPlainText([])).toBe('');
    });
  });

  // ── stylesEqual ────────────────────────────────────

  describe('stylesEqual', () => {
    it('returns true for identical styles', () => {
      expect(stylesEqual({ fill: '#000' }, { fill: '#000' })).toBe(true);
    });

    it('returns true when both have undefined fields', () => {
      expect(stylesEqual({}, {})).toBe(true);
    });

    it('returns false when one field differs', () => {
      expect(stylesEqual({ fill: '#000' }, { fill: '#fff' })).toBe(false);
    });

    it('returns false with different fontWeight', () => {
      expect(stylesEqual({ fontWeight: 'bold' }, { fontWeight: 'normal' })).toBe(false);
    });
  });

  // ── mergeAdjacentRuns ──────────────────────────────

  describe('mergeAdjacentRuns', () => {
    it('merges runs with identical styles', () => {
      const runs = [run('He', '#000'), run('llo', '#000')];
      const merged = mergeAdjacentRuns(runs);
      expect(merged).toHaveLength(1);
      expect(merged[0].text).toBe('Hello');
    });

    it('does not merge runs with different styles', () => {
      const runs = [run('He', '#f00'), run('llo', '#000')];
      const merged = mergeAdjacentRuns(runs);
      expect(merged).toHaveLength(2);
    });

    it('filters out empty runs', () => {
      const runs = [run('', '#000'), run('Hello', '#000')];
      const merged = mergeAdjacentRuns(runs);
      expect(merged).toHaveLength(1);
      expect(merged[0].text).toBe('Hello');
    });

    it('returns empty array for empty input', () => {
      expect(mergeAdjacentRuns([])).toEqual([]);
    });
  });

  // ── splitRunsAtBoundaries ──────────────────────────

  describe('splitRunsAtBoundaries', () => {
    it('splits a single run at start and end boundaries', () => {
      const runs = [run('Hello World', '#000')];
      const split = splitRunsAtBoundaries(runs, 5, 6);
      // "Hello" + " " + "World"
      expect(split).toHaveLength(3);
      expect(split[0].text).toBe('Hello');
      expect(split[1].text).toBe(' ');
      expect(split[2].text).toBe('World');
    });

    it('no splits needed when boundaries align with run edges', () => {
      const runs = [run('Hello', '#000'), run(' World', '#f00')];
      const split = splitRunsAtBoundaries(runs, 0, 5);
      expect(split).toHaveLength(2);
      expect(split[0].text).toBe('Hello');
      expect(split[1].text).toBe(' World');
    });
  });

  // ── setStyleOnRange ────────────────────────────────

  describe('setStyleOnRange', () => {
    it('applies style to the entire text', () => {
      const runs = [run('Hello', '#000')];
      const result = setStyleOnRange(runs, 0, 5, { fill: '#f00' });
      expect(result).toHaveLength(1);
      expect(result[0].style.fill).toBe('#f00');
    });

    it('applies style to a partial range, splitting runs', () => {
      const runs = [run('Hello World', '#000')];
      const result = setStyleOnRange(runs, 0, 5, { fontWeight: 'bold' });
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Hello');
      expect(result[0].style.fontWeight).toBe('bold');
      expect(result[1].text).toBe(' World');
      expect(result[1].style.fontWeight).toBeUndefined();
    });

    it('noop for empty range', () => {
      const runs = [run('Hello', '#000')];
      const result = setStyleOnRange(runs, 3, 3, { fill: '#f00' });
      expect(result).toHaveLength(1);
      expect(result[0].style.fill).toBe('#000');
    });

    it('applies across multiple runs', () => {
      const runs = [run('Hello', '#000'), run(' World', '#000')];
      const result = setStyleOnRange(runs, 3, 8, { fill: '#f00' });
      // "Hel" #000 + "lo Wo" #f00 + "rld" #000
      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('Hel');
      expect(result[0].style.fill).toBe('#000');
      expect(result[1].text).toBe('lo Wo');
      expect(result[1].style.fill).toBe('#f00');
      expect(result[2].text).toBe('rld');
      expect(result[2].style.fill).toBe('#000');
    });
  });

  // ── removeRange ────────────────────────────────────

  describe('removeRange', () => {
    it('removes characters from the middle of a run', () => {
      const runs = [run('Hello World', '#000')];
      const result = removeRange(runs, 5, 6);
      expect(getPlainText(result)).toBe('HelloWorld');
    });

    it('removes an entire run', () => {
      const runs = [run('Hello', '#000'), run(' ', '#fff'), run('World', '#000')];
      const result = removeRange(runs, 5, 6);
      expect(result).toHaveLength(1);
      expect(getPlainText(result)).toBe('HelloWorld');
    });

    it('noop when start >= end', () => {
      const runs = [run('Hello', '#000')];
      const result = removeRange(runs, 3, 3);
      expect(getPlainText(result)).toBe('Hello');
    });

    it('removes all characters', () => {
      const runs = [run('Hello', '#000')];
      const result = removeRange(runs, 0, 5);
      expect(result).toHaveLength(0);
    });
  });

  // ── insertText ─────────────────────────────────────

  describe('insertText', () => {
    it('inserts at the beginning', () => {
      const runs = [run('World', '#000')];
      const result = insertText(runs, 0, 'Hello ');
      expect(getPlainText(result)).toBe('Hello World');
      expect(result).toHaveLength(1); // same style -> merged
    });

    it('inserts in the middle', () => {
      const runs = [run('HWorld', '#000')];
      const result = insertText(runs, 1, 'ello ');
      expect(getPlainText(result)).toBe('Hello World');
    });

    it('inserts at the end', () => {
      const runs = [run('Hello', '#000')];
      const result = insertText(runs, 5, ' World');
      expect(getPlainText(result)).toBe('Hello World');
    });

    it('inherits style of the run at the position', () => {
      const runs = [run('Hello', '#f00'), run('World', '#00f')];
      const result = insertText(runs, 5, ' ');
      // Inserted at boundary of first run — inherits #f00
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Hello ');
      expect(result[0].style.fill).toBe('#f00');
    });

    it('noop for empty text', () => {
      const runs = [run('Hello', '#000')];
      const result = insertText(runs, 0, '');
      expect(getPlainText(result)).toBe('Hello');
    });
  });

  // ── replaceRange ───────────────────────────────────

  describe('replaceRange', () => {
    it('replaces a range with new text', () => {
      const runs = [run('Hello World', '#000')];
      const result = replaceRange(runs, 5, 11, ' Earth');
      expect(getPlainText(result)).toBe('Hello Earth');
    });

    it('replaces entire content', () => {
      const runs = [run('Hello', '#000')];
      const result = replaceRange(runs, 0, 5, 'Bye');
      expect(getPlainText(result)).toBe('Bye');
    });
  });

  // ── immutability ──────────────────────────────────

  describe('immutability', () => {
    it('setStyleOnRange does not mutate input runs', () => {
      const original: TextRun[] = [{ text: 'Hello', style: { fill: '#000' } }];
      setStyleOnRange(original, 0, 5, { fill: '#f00' });
      expect(original[0].style.fill).toBe('#000');
    });

    it('insertText does not mutate input runs', () => {
      const original: TextRun[] = [{ text: 'Hello', style: { fill: '#000' } }];
      insertText(original, 0, 'X');
      expect(original[0].text).toBe('Hello');
    });

    it('removeRange does not mutate input runs', () => {
      const original: TextRun[] = [{ text: 'Hello', style: { fill: '#000' } }];
      removeRange(original, 0, 3);
      expect(original[0].text).toBe('Hello');
    });
  });
});
