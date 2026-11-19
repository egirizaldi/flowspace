import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthCheckResult } from './health.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and database health status' })
  @ApiResponse({
    status: 200,
    description: 'API and database health status',
    type: ApiResponseDto,
  })
  async check() {
    const data: HealthCheckResult = await this.healthService.check();
    return {
      success: data.status === 'ok',
      message: data.status === 'ok' ? 'FlowSpace API is healthy' : 'FlowSpace API is degraded',
      data,
    };
  }
}
