import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SessionService } from '../../modules/auth/session.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const cookieName = this.sessionService.getCookieName();
    let rawToken = request.cookies?.[cookieName];

    if (!rawToken) {
      const authHeader = request.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        rawToken = authHeader.substring(7).trim();
      }
    }

    if (!rawToken) {
      throw new UnauthorizedException('Authentication required');
    }

    const sessionData = await this.sessionService.validateSession(rawToken);

    if (!sessionData) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    (request as any).user = sessionData.user;
    (request as any).session = sessionData.session;

    return true;
  }
}
