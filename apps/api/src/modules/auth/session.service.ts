import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { Session } from '@prisma/client';
import { SafeUser, sanitizeUser } from '../users/users.service';
import * as crypto from 'crypto';
import { Response } from 'express';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  private readonly cookieName: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.cookieName = this.configService.get<string>(
      'session.cookieName',
      'flowspace_session',
    );
    this.isProduction = this.configService.get<string>('nodeEnv') === 'production';
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ rawToken: string; session: Session }> {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
      },
    });

    return { rawToken, session };
  }

  async validateSession(
    rawToken: string,
  ): Promise<{ session: Session; user: SafeUser } | null> {
    if (!rawToken) {
      return null;
    }

    const tokenHash = this.hashToken(rawToken);

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt !== null || session.expiresAt <= new Date()) {
      return null;
    }

    // Touch lastUsedAt asynchronously
    this.prisma.session
      .update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return {
      session,
      user: sanitizeUser(session.user),
    };
  }

  async revokeSession(rawToken: string): Promise<boolean> {
    if (!rawToken) {
      return false;
    }

    const tokenHash = this.hashToken(rawToken);

    try {
      await this.prisma.session.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  setSessionCookie(res: Response, rawToken: string) {
    res.cookie(this.cookieName, rawToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: SEVEN_DAYS_MS,
    });
  }

  clearSessionCookie(res: Response) {
    res.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }
}
