import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import { Reflector } from '@nestjs/core';

export const SKIP_AUDIT_KEY = 'skip-audit';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipAudit = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAudit) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, ip } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
          await this.auditService.log({
            utilisateurId: user?.id,
            action: `${method} ${url}`,
            entiteType: this.extractEntityType(url),
            entiteId: response?.id || null,
            details: {
              method,
              url,
              statusCode: context.switchToHttp().getResponse().statusCode,
              durationMs: Date.now() - startTime,
              bodyKeys: body ? Object.keys(body) : [],
            },
            ip: ip || request.headers['x-forwarded-for'] || 'unknown',
          });
        }
      }),
    );
  }

  private extractEntityType(url: string): string {
    if (url.includes('/ministeres')) return 'ministere';
    if (url.includes('/directions')) return 'direction';
    if (url.includes('/utilisateurs')) return 'utilisateur';
    if (url.includes('/courriers')) return 'courrier';
    if (url.includes('/auth')) return 'auth';
    return 'unknown';
  }
}
