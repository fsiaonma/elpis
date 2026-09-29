import { Module } from '@nestjs/common';
import { AgentModule } from './agent/agent.module';
import { AiController } from './ai.controller';
import { GuardrailModule } from './guardrail/guardrail.module';
import { McpModule } from './mcp/mcp.module';
import { MemoryModule } from './memory/memory.module';
import { RagModule } from './rag/rag.module';
import { RuntimeModule } from './runtime/runtime.module';
import { SkillModule } from './skill/skill.module';
import { StoreModule } from './store/store.module';
import { ToolModule } from './tool/tool.module';
import { TraceModule } from './trace/trace.module';

@Module({
  imports: [
    StoreModule,
    SkillModule,
    ToolModule,
    McpModule,
    AgentModule,
    TraceModule,
    RuntimeModule,
    RagModule,
    MemoryModule,
    GuardrailModule,
  ],
  controllers: [AiController],
  exports: [
    StoreModule,
    SkillModule,
    ToolModule,
    McpModule,
    AgentModule,
    TraceModule,
    RuntimeModule,
    RagModule,
    MemoryModule,
  ],
})
export class AiModule {}
