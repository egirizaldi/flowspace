import { describe, it, expect } from 'vitest';
import { calculateNewPosition } from './kanban-position';

describe('Kanban Position Calculator (FS-039)', () => {
  it('returns default position 10000.000000 for empty column', () => {
    const pos = calculateNewPosition([], 0);
    expect(pos).toBe('10000.000000');
  });

  it('calculates position when inserted at top', () => {
    const tasks = [
      { id: 't-1', position: '10000.000000' },
      { id: 't-2', position: '20000.000000' },
    ];
    const pos = calculateNewPosition(tasks, 0);
    expect(Number(pos)).toBeLessThan(10000);
    expect(Number(pos)).toBe(5000);
  });

  it('calculates position when inserted at bottom', () => {
    const tasks = [
      { id: 't-1', position: '10000.000000' },
      { id: 't-2', position: '20000.000000' },
    ];
    const pos = calculateNewPosition(tasks, 2);
    expect(Number(pos)).toBeGreaterThan(20000);
    expect(Number(pos)).toBe(30000);
  });

  it('calculates midpoint position when inserted between two tasks', () => {
    const tasks = [
      { id: 't-1', position: '10000.000000' },
      { id: 't-2', position: '20000.000000' },
    ];
    const pos = calculateNewPosition(tasks, 1);
    expect(Number(pos)).toBe(15000);
  });
});
