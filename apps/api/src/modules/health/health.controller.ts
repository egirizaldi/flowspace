import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthCheckResult } from './health.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({
    status: 200,
    description: 'API is running and healthy',
    type: ApiResponseDto,
  })
  check() {
    const data: HealthCheckResult = this.healthService.check();
    return {
      success: true,
      message: 'FlowSpace API is healthy',
      data,
    };
  }
}
