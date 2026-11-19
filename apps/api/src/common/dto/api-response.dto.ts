import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiPaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class ApiErrorPayloadDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string;

  @ApiPropertyOptional({ example: null })
  details?: unknown;
}

export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Request completed successfully' })
  message: string;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional({ type: () => ApiPaginationMetaDto })
  meta?: ApiPaginationMetaDto;

  @ApiPropertyOptional({ type: () => ApiErrorPayloadDto })
  error?: ApiErrorPayloadDto;
}
