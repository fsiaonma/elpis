import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import nunjucks from 'nunjucks';
import * as path from 'path';
import { ConfigService } from '../../config/config.service';
import { LoggerProvider } from '../../extend/logger.provider';

@Controller('view')
export class ViewController {
  private readonly nunjucksEnv: nunjucks.Environment;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerProvider: LoggerProvider,
  ) {
    this.nunjucksEnv = nunjucks.configure(
      path.resolve(process.cwd(), 'app/public'),
      {
        noCache: true,
        trimBlocks: true,
      },
    );
  }

  @Get([':page', ':page/{*path}'])
  @Header('Content-Type', 'text/html')
  renderPage(
    @Param('page') page: string,
    @Query() query: Record<string, string | undefined>,
  ): string {
    this.loggerProvider.logger.info(
      `[ViewController] query: ${JSON.stringify(query)}`,
    );
    this.loggerProvider.logger.info(
      `[ViewController] params: ${JSON.stringify({ page })}`,
    );

    return this.nunjucksEnv.render(`dist/entry.${page}.tpl`, {
      projKey: query.proj_key,
      name: this.configService.get('name'),
      env: process.env._ENV ?? 'local',
      options: JSON.stringify(this.configService.getBootstrapOptions()),
    });
  }
}
