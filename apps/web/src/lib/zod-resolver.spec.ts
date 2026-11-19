import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodResolver } from './zod-resolver';

describe('zodResolver', () => {
  const schema = z.object({
    name: z.string().min(2, 'Name too short'),
    email: z.string().email('Invalid email'),
  });

  const resolver = zodResolver(schema);

  it('should return values with empty errors when validation passes', async () => {
    const validData = { name: 'Alice', email: 'alice@example.com' };
    const result = await resolver(validData, undefined, {} as any);

    expect(result.errors).toEqual({});
    expect(result.values).toEqual(validData);
  });

  it('should return mapped errors when validation fails', async () => {
    const invalidData = { name: 'A', email: 'not-an-email' };
    const result = await resolver(invalidData, undefined, {} as any);

    expect(result.errors.name).toBeDefined();
    expect(result.errors.name?.message).toBe('Name too short');
    expect(result.errors.email).toBeDefined();
    expect(result.errors.email?.message).toBe('Invalid email');
    expect(result.values).toEqual({});
  });
});
