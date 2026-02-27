import { describe, it, expect } from 'vitest';
import { extractFilename } from './extract-filename';

describe('extractFilename', () => {
  describe('string URLs', () => {
    it('extracts filename from a simple URL', () => {
      expect(extractFilename('https://example.com/photos/sunset.jpg')).toBe('sunset');
    });

    it('extracts filename from URL with query string', () => {
      expect(extractFilename('https://cdn.example.com/img/photo.png?w=800&h=600')).toBe('photo');
    });

    it('extracts filename from URL with hash', () => {
      expect(extractFilename('https://example.com/avatar.webp#section')).toBe('avatar');
    });

    it('returns "image" for data URLs', () => {
      expect(extractFilename('data:image/png;base64,iVBOR')).toBe('image');
    });

    it('returns "image" for blob URLs', () => {
      expect(extractFilename('blob:http://localhost/abc-123')).toBe('image');
    });

    it('handles URL without extension', () => {
      expect(extractFilename('https://example.com/images/avatar')).toBe('avatar');
    });

    it('handles encoded characters in URL', () => {
      expect(extractFilename('https://example.com/my%20photo.jpg')).toBe('my photo');
    });
  });

  describe('File sources', () => {
    it('extracts name from File', () => {
      const file = new File(['data'], 'vacation-photo.jpg', { type: 'image/jpeg' });
      expect(extractFilename(file)).toBe('vacation-photo');
    });

    it('strips extension from File name', () => {
      const file = new File(['data'], 'screenshot.png', { type: 'image/png' });
      expect(extractFilename(file)).toBe('screenshot');
    });

    it('returns "image" for File with empty name', () => {
      const file = new File(['data'], '', { type: 'image/jpeg' });
      expect(extractFilename(file)).toBe('image');
    });
  });

  describe('Blob sources', () => {
    it('returns "image" for Blob', () => {
      const blob = new Blob(['data'], { type: 'image/png' });
      expect(extractFilename(blob)).toBe('image');
    });
  });
});
