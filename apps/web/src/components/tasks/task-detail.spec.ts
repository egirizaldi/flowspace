import { describe, it, expect } from 'vitest';
import { createTaskSchema, updateTaskSchema, createLabelSchema } from '@flowspace/shared';
import { zodResolver } from '../../lib/zod-resolver';

describe('Task Detail UI Schemas & Form Validation (FS-036)', () => {
  it('validates task creation input properly with zodResolver', async () => {
    const resolver = zodResolver(createTaskSchema);

    // Valid task
    const validData = {
      title: 'Implement Authentication Flow',
      description: 'Use Argon2 and session tokens',
      priority: 'HIGH' as const,
      dueDate: '2026-12-31',
    };
    const validResult = await resolver(validData as any, undefined, {} as any);
    expect(validResult.errors).toEqual({});
    expect(validResult.values.title).toBe('Implement Authentication Flow');

    // Invalid task (empty title)
    const invalidData = {
      title: '',
      priority: 'HIGH' as const,
    };
    const invalidResult = await resolver(invalidData as any, undefined, {} as any);
    expect(invalidResult.errors.title).toBeDefined();
    expect(invalidResult.errors.title?.message).toBe('Task title is required');
  });

  it('validates task update input with optimistic concurrency version', async () => {
    const resolver = zodResolver(updateTaskSchema);

    // Valid update
    const validUpdate = {
      title: 'Updated Task Title',
      priority: 'URGENT' as const,
      version: 2,
    };
    const res = await resolver(validUpdate as any, undefined, {} as any);
    expect(res.errors).toEqual({});

    // Missing version
    const invalidUpdate = {
      title: 'Missing Version',
    };
    const invalidRes = await resolver(invalidUpdate as any, undefined, {} as any);
    expect(invalidRes.errors.version).toBeDefined();
  });

  it('validates hex color and name for project labels', async () => {
    const resolver = zodResolver(createLabelSchema);

    // Valid label
    const validLabel = {
      name: 'Bug',
      color: '#ef4444',
    };
    const res = await resolver(validLabel as any, undefined, {} as any);
    expect(res.errors).toEqual({});

    // Invalid color
    const invalidLabel = {
      name: 'Bug',
      color: 'red',
    };
    const resInvalid = await resolver(invalidLabel as any, undefined, {} as any);
    expect(resInvalid.errors.color).toBeDefined();
  });
});
