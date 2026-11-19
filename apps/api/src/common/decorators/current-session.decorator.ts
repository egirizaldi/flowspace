import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Session } from '@prisma/client';

export const CurrentSession = createParamDecorator(
  (data: keyof Session | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.session;
    return data && session ? session[data] : session;
  },
);
