import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../../database/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status envelope with database status', async () => {
      const result = await controller.check();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message', 'FlowSpace API is healthy');
      expect(result.data).toHaveProperty('status', 'ok');
      expect(result.data).toHaveProperty('service', 'flowspace-api');
      expect(result.data).toHaveProperty('database', 'connected');
    });

    it('should return degraded status if database is unreachable', async () => {
      jest.spyOn(service, 'check').mockResolvedValueOnce({
        status: 'degraded',
        service: 'flowspace-api',
        uptime: 10,
        timestamp: new Date().toISOString(),
        environment: 'test',
        database: 'disconnected',
      });

      const result = await controller.check();
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('message', 'FlowSpace API is degraded');
      expect(result.data.database).toBe('disconnected');
    });
  });
});
