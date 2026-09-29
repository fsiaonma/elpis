import { Module } from '@nestjs/common';
import { GuardrailService } from './guardrail.service';

@Module({
  providers: [GuardrailService],
  exports: [GuardrailService],
})
export class GuardrailModule {}
