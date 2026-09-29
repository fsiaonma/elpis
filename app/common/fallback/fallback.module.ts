import { Module } from '@nestjs/common';
import { FallbackController } from './fallback.controller';

@Module({
  controllers: [FallbackController],
})
export class FallbackModule {}
