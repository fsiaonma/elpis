import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import md5 from 'md5';
import { ConfigService } from '../../config/config.service';
import { LoggerProvider } from '../../extend/logger.provider';

const SIGN_KEY = 'klx05hb3n1c9ujp8uhxbs2ikkiowp212';
const SIGN_TIMEOUT_MS = 600000;

@Injectable()
export class ApiSignGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly loggerProvider: LoggerProvider,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = request.path as string;
    const method = request.method as string;

    const whiteList = this.configService.get('apiSignVerify.whiteList') as
      | string[]
      | undefined;
    if (whiteList?.includes(path)) {
      return true;
    }

    if (path.indexOf('/api') < 0) {
      return true;
    }

    const sSign = request.headers['s_sign'] as string | undefined;
    const st = request.headers['s_t'] as string | undefined;

    const signature = md5(`${SIGN_KEY}_${st}`).toLowerCase();
    this.loggerProvider.logger.info(`[${method} ${path}] signature: ${signature}`);

    if (
      !sSign ||
      !st ||
      signature !== sSign.toLowerCase() ||
      Date.now() - Number(st) > SIGN_TIMEOUT_MS
    ) {
      throw new HttpException(
        {
          success: false,
          message: 'signature not correct or api timeout!!',
          code: 445,
        },
        HttpStatus.OK,
      );
    }

    return true;
  }
}
