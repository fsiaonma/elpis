import { Module } from '@nestjs/common';
import { SkillModule } from '../skill/skill.module';
import { ExecutorService } from './executor.service';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  imports: [SkillModule],
  providers: [ToolRegistryService, ExecutorService],
  exports: [ToolRegistryService, ExecutorService],
})
export class ToolModule {}
