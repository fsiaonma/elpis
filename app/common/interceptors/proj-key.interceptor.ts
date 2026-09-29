import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';

@Injectable()
export class ProjKeyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      path?: string;
      url?: string;
      headers: Record<string, string | string[] | undefined>;
      projKey?: string;
    }>();

    const path = request.path ?? request.url ?? '';
    if (!path.includes('/api/proj/')) {
      return next.handle();
    }

    const projKey = request.headers['proj_key'];
    if (!projKey) {
      const response = context.switchToHttp().getResponse();
      response.status(200);
      return of({
        success: false,
        message: 'proj_key not found',
        code: 446,
      });
    }

    request.projKey = Array.isArray(projKey) ? projKey[0] : projKey;
    return next.handle();
  }
}
