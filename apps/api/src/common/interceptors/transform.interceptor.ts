import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map((res) => {
        // If the controller already returned the standardized envelope, pass through
        if (
          res &&
          typeof res === 'object' &&
          'success' in res &&
          typeof res.success === 'boolean'
        ) {
          return res;
        }

        return {
          success: true,
          message: 'Request completed successfully',
          data: res ?? null,
        };
      }),
    );
  }
}
