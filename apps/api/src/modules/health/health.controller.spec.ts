import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status envelope', () => {
      const result = controller.check();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message', 'FlowSpace API is healthy');
      expect(result.data).toHaveProperty('status', 'ok');
      expect(result.data).toHaveProperty('service', 'flowspace-api');
    });
  });
});
