import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ElpisModule } from './elpis.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ApiSignGuard } from './common/guards/api-sign.guard';
import { ProjKeyInterceptor } from './common/interceptors/proj-key.interceptor';
import { createElpisValidationPipe } from './common/pipes';
import { BootstrapOptions } from './config/bootstrap-options';
import { ConfigService } from './config/config.service';
import { LoggerProvider } from './extend/logger.provider';

export async function bootstrap(options: BootstrapOptions = {}) {
  const app = await NestFactory.create(AppModule.register(options));
  ElpisModule.configureStatic(app);
  app.useGlobalPipes(createElpisValidationPipe());
  app.useGlobalFilters(
    new AllExceptionsFilter(app.get(ConfigService), app.get(LoggerProvider)),
  );
  app.useGlobalGuards(
    new ApiSignGuard(app.get(ConfigService), app.get(LoggerProvider)),
  );
  app.useGlobalInterceptors(new ProjKeyInterceptor());
  const port = process.env.PORT || 8080;
  const host = process.env.IP || '0.0.0.0';
  await app.listen(port, host);
  console.log(`Server runnin on port: ${port}`);
  return app;
}
