import { describe, it, expect } from 'vitest';
import { ApiClientError } from './api-client';

describe('ApiClientError', () => {
  it('should instantiate correctly with code, status, and message', () => {
    const error = new ApiClientError(404, 'NOT_FOUND', 'Resource not found', {
      entity: 'Task',
    });

    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
    expect(error.details).toEqual({ entity: 'Task' });
    expect(error.name).toBe('ApiClientError');
  });

  it('should handle optional details being undefined', () => {
    const error = new ApiClientError(500, 'INTERNAL_SERVER_ERROR', 'Server error');
    expect(error.details).toBeUndefined();
  });
});
