import { Module } from '@nestjs/common';
import { SkillScannerService } from './skill-scanner.service';

@Module({
  providers: [SkillScannerService],
  exports: [SkillScannerService],
})
export class SkillModule {}
