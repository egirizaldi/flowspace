import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  service: string;
  uptime: number;
  timestamp: string;
  environment: string;
  database: 'connected' | 'disconnected';
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    let databaseStatus: 'connected' | 'disconnected' = 'connected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error('Database health ping failed', error);
      databaseStatus = 'disconnected';
    }

    return {
      status: databaseStatus === 'connected' ? 'ok' : 'degraded',
      service: 'flowspace-api',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: databaseStatus,
    };
  }
}
