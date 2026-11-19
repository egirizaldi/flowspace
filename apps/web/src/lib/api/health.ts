import { apiClient } from '../api-client';

export interface HealthCheckData {
  status: 'ok' | 'degraded';
  service: string;
  uptime: number;
  timestamp: string;
  environment: string;
  database: 'connected' | 'disconnected';
}

export async function getHealth(): Promise<HealthCheckData> {
  const response = await apiClient.get<HealthCheckData>('/health');
  return response.data;
}
