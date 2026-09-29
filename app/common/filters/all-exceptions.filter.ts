import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { LoggerProvider } from '../../extend/logger.provider';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly loggerProvider: LoggerProvider,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (response.headersSent) {
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === HttpStatus.FORBIDDEN || status === HttpStatus.FOUND) {
        return;
      }

      const exceptionResponse = exception.getResponse();
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'code' in exceptionResponse
      ) {
        response.status(status).json(exceptionResponse);
        return;
      }
    }

    if (
      exception instanceof Error &&
      (exception as NodeJS.ErrnoException).code === 'ERR_HTTP_HEADERS_SENT'
    ) {
      return;
    }

    const logger = this.loggerProvider.logger;
    logger.info(JSON.stringify(exception));
    logger.error('[-- exception --]:', exception);

    const { status, message, detail } = this.extractErrorInfo(exception);
    logger.error('[-- exception --]:', status, message, detail);

    if (message && message.indexOf('template not found') > -1) {
      const homePage = this.configService.get('homePage') as string | undefined;
      response.redirect(302, `${homePage}`);
      return;
    }

    response.status(HttpStatus.OK).json({
      succes: false,
      code: 50000,
      message: '网络异常 请稍后重试',
    });
  }

  private extractErrorInfo(exception: unknown): {
    status?: number;
    message?: string;
    detail?: unknown;
  } {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      const rawMessage = (exceptionResponse as { message?: unknown }).message;
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : Array.isArray(rawMessage)
            ? rawMessage.join(', ')
            : String(rawMessage ?? '');

      return { status: exception.getStatus(), message };
    }

    if (exception instanceof Error) {
      return {
        status: (exception as Error & { status?: number }).status,
        message: exception.message,
        detail: (exception as Error & { detail?: unknown }).detail,
      };
    }

    return {};
  }
}
