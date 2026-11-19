export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiUrl: string;
  frontendUrl: string;
  databaseUrl: string;
  redisUrl?: string;
  session: {
    cookieName: string;
    secret: string;
    expiresIn: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.APP_PORT || '3001', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/flowspace_dev?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || 'flowspace_session',
    secret:
      process.env.SESSION_SECRET ||
      'flowspace-local-dev-secret-key-change-in-production-min-32-chars',
    expiresIn: process.env.SESSION_EXPIRES_IN || '7d',
  },
});
