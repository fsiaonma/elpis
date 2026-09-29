import { DynamicModule, Module } from '@nestjs/common';
import { BOOTSTRAP_OPTIONS, BootstrapOptions } from './bootstrap-options';
import { ConfigService } from './config.service';

@Module({})
export class ConfigModule {
  static register(options: BootstrapOptions = {}): DynamicModule {
    return {
      module: ConfigModule,
      global: true,
      providers: [
        { provide: BOOTSTRAP_OPTIONS, useValue: options },
        ConfigService,
      ],
      exports: [ConfigService],
    };
  }
}
