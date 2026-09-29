import { Module } from '@nestjs/common';
import { DatabaseProvider } from './database.provider';
import { LoggerProvider } from './logger.provider';
@Module({
  providers: [DatabaseProvider, LoggerProvider],
  exports: [DatabaseProvider, LoggerProvider],
})
export class ExtendModule {}
