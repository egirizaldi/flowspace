import { FieldErrors, Resolver } from 'react-hook-form';
import { ZodType } from 'zod';

export function zodResolver<T extends Record<string, any>>(schema: ZodType<T>): Resolver<T> {
  return async (values) => {
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      return {
        values: result.data,
        errors: {},
      };
    }

    const errors: FieldErrors<T> = {};

    for (const issue of result.error.issues) {
      const path = issue.path[0] as keyof T;
      if (path && !errors[path]) {
        errors[path] = {
          type: issue.code,
          message: issue.message,
        } as any;
      }
    }

    return {
      values: {},
      errors,
    };
  };
}
