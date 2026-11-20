import { describe, it, expect } from 'vitest';
import { formatRelativeTime, tokenizeComment } from './format-comment';

describe('Comment Utilities (FS-043)', () => {
  describe('formatRelativeTime', () => {
    it('returns "just now" for dates within 30 seconds', () => {
      const now = new Date('2026-11-20T12:00:00Z');
      const past = new Date('2026-11-20T11:59:45Z');
      expect(formatRelativeTime(past, now)).toBe('just now');
    });

    it('formats minutes ago properly', () => {
      const now = new Date('2026-11-20T12:00:00Z');
      const past = new Date('2026-11-20T11:55:00Z');
      expect(formatRelativeTime(past, now)).toBe('5m ago');
    });

    it('formats hours ago properly', () => {
      const now = new Date('2026-11-20T12:00:00Z');
      const past = new Date('2026-11-20T09:00:00Z');
      expect(formatRelativeTime(past, now)).toBe('3h ago');
    });

    it('formats days ago properly', () => {
      const now = new Date('2026-11-20T12:00:00Z');
      const past = new Date('2026-11-18T12:00:00Z');
      expect(formatRelativeTime(past, now)).toBe('2d ago');
    });

    it('formats month and day for dates older than 7 days in the same year', () => {
      const now = new Date('2026-11-20T12:00:00Z');
      const past = new Date('2026-10-15T12:00:00Z');
      expect(formatRelativeTime(past, now)).toBe('Oct 15');
    });

    it('includes year for dates from previous years', () => {
      const now = new Date('2026-11-20T12:00:00Z');
      const past = new Date('2025-10-15T12:00:00Z');
      expect(formatRelativeTime(past, now)).toBe('Oct 15, 2025');
    });
  });

  describe('tokenizeComment', () => {
    it('tokenizes plain text', () => {
      const tokens = tokenizeComment('Hello world');
      expect(tokens).toEqual([{ type: 'text', value: 'Hello world' }]);
    });

    it('tokenizes bold and italic markdown', () => {
      const tokens = tokenizeComment('This is **bold** and *italic*');
      expect(tokens).toEqual([
        { type: 'text', value: 'This is ' },
        { type: 'bold', value: 'bold' },
        { type: 'text', value: ' and ' },
        { type: 'italic', value: 'italic' },
      ]);
    });

    it('tokenizes inline code', () => {
      const tokens = tokenizeComment('Run `pnpm test` to verify');
      expect(tokens).toEqual([
        { type: 'text', value: 'Run ' },
        { type: 'code', value: 'pnpm test' },
        { type: 'text', value: ' to verify' },
      ]);
    });

    it('tokenizes @mentions', () => {
      const tokens = tokenizeComment('Hey @alex and @jane_doe please review');
      expect(tokens).toEqual([
        { type: 'text', value: 'Hey ' },
        { type: 'mention', value: '@alex' },
        { type: 'text', value: ' and ' },
        { type: 'mention', value: '@jane_doe' },
        { type: 'text', value: ' please review' },
      ]);
    });

    it('handles multiple lines with newlines', () => {
      const tokens = tokenizeComment('Line 1\nLine 2');
      expect(tokens).toEqual([
        { type: 'text', value: 'Line 1' },
        { type: 'newline', value: '\n' },
        { type: 'text', value: 'Line 2' },
      ]);
    });
  });
});
