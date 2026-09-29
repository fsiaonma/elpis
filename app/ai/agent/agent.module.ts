import { Module } from '@nestjs/common';
import { AgentScannerService } from './agent-scanner.service';

@Module({
  providers: [AgentScannerService],
  exports: [AgentScannerService],
})
export class AgentModule {}
