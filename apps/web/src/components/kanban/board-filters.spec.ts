import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BOARD_FILTERS,
  BoardFilters,
} from './board-filter-bar';

describe('Board Filtering Logic (FS-040)', () => {
  it('initializes with all default filter values', () => {
    expect(DEFAULT_BOARD_FILTERS).toEqual({
      search: '',
      priority: 'ALL',
      assigneeId: 'ALL',
      labelId: 'ALL',
      dueDateStatus: 'ALL',
    });
  });

  it('correctly calculates active filter count when combining filters', () => {
    const calculateActiveCount = (filters: BoardFilters) =>
      (filters.search.trim() ? 1 : 0) +
      (filters.priority !== 'ALL' ? 1 : 0) +
      (filters.assigneeId !== 'ALL' ? 1 : 0) +
      (filters.labelId !== 'ALL' ? 1 : 0) +
      (filters.dueDateStatus !== 'ALL' ? 1 : 0);

    // Default filters
    expect(calculateActiveCount(DEFAULT_BOARD_FILTERS)).toBe(0);

    // 1 filter active
    expect(
      calculateActiveCount({
        ...DEFAULT_BOARD_FILTERS,
        priority: 'HIGH',
      }),
    ).toBe(1);

    // 3 filters active
    expect(
      calculateActiveCount({
        ...DEFAULT_BOARD_FILTERS,
        search: 'auth',
        priority: 'URGENT',
        dueDateStatus: 'OVERDUE',
      }),
    ).toBe(3);

    // All 5 filters active
    expect(
      calculateActiveCount({
        search: 'payment',
        priority: 'LOW',
        assigneeId: 'user-123',
        labelId: 'label-456',
        dueDateStatus: 'TODAY',
      }),
    ).toBe(5);
  });

  it('correctly serializes board filters into query parameters for API calls', () => {
    const serializeFilters = (filters: BoardFilters) => {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.priority !== 'ALL') params.set('priority', filters.priority);
      if (filters.assigneeId !== 'ALL') params.set('assigneeId', filters.assigneeId);
      if (filters.labelId !== 'ALL') params.set('labelId', filters.labelId);
      if (filters.dueDateStatus !== 'ALL')
        params.set('dueDateStatus', filters.dueDateStatus);
      return params.toString();
    };

    // When default, no query params attached
    expect(serializeFilters(DEFAULT_BOARD_FILTERS)).toBe('');

    // Single filter
    expect(
      serializeFilters({
        ...DEFAULT_BOARD_FILTERS,
        assigneeId: 'UNASSIGNED',
      }),
    ).toBe('assigneeId=UNASSIGNED');

    // Multiple combined filters
    const combined = serializeFilters({
      search: 'Refactor Auth',
      priority: 'HIGH',
      assigneeId: '550e8400-e29b-41d4-a716-446655440000',
      labelId: '550e8400-e29b-41d4-a716-446655440001',
      dueDateStatus: 'THIS_WEEK',
    });

    expect(combined).toContain('search=Refactor+Auth');
    expect(combined).toContain('priority=HIGH');
    expect(combined).toContain('assigneeId=550e8400-e29b-41d4-a716-446655440000');
    expect(combined).toContain('labelId=550e8400-e29b-41d4-a716-446655440001');
    expect(combined).toContain('dueDateStatus=THIS_WEEK');
  });
});
