import { Injectable } from '@nestjs/common';
import * as log4js from 'log4js';

type Logger = Console | log4js.Logger;

@Injectable()
export class LoggerProvider {
  readonly logger: Logger;

  constructor() {
    if (process.env._ENV === 'local') {
      this.logger = console;
    } else {
      log4js.configure({
        appenders: {
          console: {
            type: 'console',
          },
          dateFile: {
            type: 'dateFile',
            filename: './logs/application.log',
            pattern: '.yyyy-MM-dd',
          },
        },
        categories: {
          default: {
            appenders: ['console', 'dateFile'],
            level: 'trace',
          },
        },
      });
      this.logger = log4js.getLogger();
    }
  }
}
