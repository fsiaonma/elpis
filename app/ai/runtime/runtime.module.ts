import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { GuardrailModule } from '../guardrail/guardrail.module';
import { MemoryModule } from '../memory/memory.module';
import { SkillModule } from '../skill/skill.module';
import { ToolModule } from '../tool/tool.module';
import { TraceModule } from '../trace/trace.module';
import { LangChainPlannerService } from './langchain/langchain-planner.service';
import { LangGraphOrchestratorService } from './langgraph/langgraph-orchestrator.service';

@Module({
  imports: [
    SkillModule,
    ToolModule,
    AgentModule,
    TraceModule,
    MemoryModule,
    GuardrailModule,
  ],
  providers: [
    LangChainPlannerService,
    LangGraphOrchestratorService,
  ],
  exports: [LangGraphOrchestratorService],
})
export class RuntimeModule {}
