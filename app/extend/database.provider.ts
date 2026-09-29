import { Injectable } from '@nestjs/common';
import knex from 'knex';
import { ConfigService } from '../config/config.service';

@Injectable()
export class DatabaseProvider {
  readonly db: ReturnType<typeof knex> | undefined;

  constructor(private readonly configService: ConfigService) {
    const dbConfig = this.configService.get('db');
    if (!dbConfig) {
      return;
    }
    this.db = knex(dbConfig as knex.Config);
  }
}
