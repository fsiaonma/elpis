import { Inject, Injectable } from '@nestjs/common';
import { createRequire } from 'module';
import * as path from 'path';
import { BOOTSTRAP_OPTIONS, BootstrapOptions } from './bootstrap-options';

const runtimeRequire = createRequire(__filename);

@Injectable()
export class ConfigService {
  private readonly config: Record<string, unknown>;
  private readonly bootstrapOptions: BootstrapOptions;

  constructor(@Inject(BOOTSTRAP_OPTIONS) options: BootstrapOptions) {
    this.bootstrapOptions = options;
    this.config = this.mergeConfig(options);
  }

  getBootstrapOptions(): BootstrapOptions {
    return this.bootstrapOptions;
  }

  get(key: string): unknown {
    if (Object.prototype.hasOwnProperty.call(this.config, key)) {
      return this.config[key];
    }

    const parts = key.split('.');
    let value: unknown = this.config;
    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return undefined;
      }
      value = (value as Record<string, unknown>)[part];
    }
    return value;
  }

  isLocal(): boolean {
    return process.env._ENV === 'local';
  }

  isBeta(): boolean {
    return process.env._ENV === 'beta';
  }

  isProduction(): boolean {
    return process.env._ENV === 'production';
  }

  private mergeConfig(options: BootstrapOptions): Record<string, unknown> {
    const elpisConfigPath = path.resolve(__dirname, '..', '..', 'config');
    let merged: Record<string, unknown> = {
      ...runtimeRequire(path.resolve(elpisConfigPath, 'config.default.js')),
    };

    const businessConfigPath = path.resolve(process.cwd(), 'config');
    try {
      merged = {
        ...merged,
        ...runtimeRequire(path.resolve(businessConfigPath, 'config.default.js')),
      };
    } catch {
      console.log('[exception] default.config file exception');
    }

    let envConfig: Record<string, unknown> = {};
    try {
      if (this.isLocal()) {
        envConfig = runtimeRequire(path.resolve(businessConfigPath, 'config.local.js'));
      } else if (this.isBeta()) {
        envConfig = runtimeRequire(path.resolve(businessConfigPath, 'config.beta.js'));
      } else if (this.isProduction()) {
        envConfig = runtimeRequire(path.resolve(businessConfigPath, 'config.prod.js'));
      }
    } catch {
      console.log('[exception] env.config file exception');
    }

    merged = Object.assign({}, merged, envConfig);

    if (options.name !== undefined) {
      merged.name = options.name;
    }
    if (options.homePage !== undefined) {
      merged.homePage = options.homePage;
    }

    return merged;
  }
}
