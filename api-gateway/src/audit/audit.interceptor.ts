import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { catchError, tap, throwError } from 'rxjs';
import { AuthenticatedRequest } from '../auth/api-key.guard';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => this.log(request, response.statusCode)),
      catchError((err) => {
        this.log(request, err?.status ?? 500);
        return throwError(() => err);
      }),
    );
  }

  private log(request: AuthenticatedRequest, statusCode: number) {
    this.audit
      .record({
        apiClient: request.apiClient ?? 'unknown',
        method: request.method,
        path: request.originalUrl,
        statusCode,
        ip: request.ip,
      })
      .catch((err) => console.error('audit log write failed:', err));
  }
}
