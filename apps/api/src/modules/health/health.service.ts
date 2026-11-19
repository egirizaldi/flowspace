import { Injectable } from '@nestjs/common';

export interface HealthCheckResult {
  status: 'ok';
  service: string;
  uptime: number;
  timestamp: string;
  environment: string;
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  check(): HealthCheckResult {
    return {
      status: 'ok',
      service: 'flowspace-api',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
