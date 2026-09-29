import { Injectable } from '@nestjs/common';
import { ExecuteResult, PlanAction } from '../contracts';
import { SkillScannerService } from '../skill/skill-scanner.service';
import { ToolRegistryService } from './tool-registry.service';

export interface ExecutorContext {
  skillNames: Set<string>;
  toolNames: Set<string>;
}

@Injectable()
export class ExecutorService {
  constructor(
    private readonly skillScannerService: SkillScannerService,
    private readonly toolRegistryService: ToolRegistryService,
  ) {}

  async execute(
    action: PlanAction,
    context: ExecutorContext,
  ): Promise<ExecuteResult> {
    if (action.type === 'final') {
      return {
        success: true,
        result: action.output ?? '',
      };
    }

    const name = action.name;
    if (!name) {
      return {
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'action name is required',
        },
      };
    }

    if (context.skillNames.has(name)) {
      return this.executeSkill(name, action.args);
    }

    if (context.toolNames.has(name)) {
      return this.executeTool(name, action.args);
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ACTION',
        message: `unknown skill or tool: ${name}`,
      },
    };
  }

  private async executeSkill(name: string, args: unknown): Promise<ExecuteResult> {
    const skill = this.skillScannerService.get(name);
    if (!skill) {
      return {
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: `skill not found: ${name}`,
        },
      };
    }

    try {
      const result = await skill.execute(args ?? {}, {});
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SKILL_ERROR',
          message: error instanceof Error ? error.message : 'skill execution failed',
        },
      };
    }
  }

  private async executeTool(name: string, args: unknown): Promise<ExecuteResult> {
    const tool = this.toolRegistryService.get(name);
    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `tool not found: ${name}`,
        },
      };
    }

    try {
      const result = await tool.execute(args ?? {});
      return {
        success: true,
        result: this.formatToolResult(result),
        source: tool.source,
      };
    } catch (error) {
      return {
        success: false,
        source: tool.source,
        error: {
          code: 'TOOL_ERROR',
          message: error instanceof Error ? error.message : 'tool execution failed',
        },
      };
    }
  }

  private formatToolResult(result: unknown): unknown {
    if (!result || typeof result !== 'object' || !Array.isArray((result as { hits?: unknown }).hits)) {
      return result;
    }

    const hits = (result as {
      hits: Array<{ docId: string; text: string; score: number; id?: string; meta?: unknown }>;
    }).hits;

    return {
      hits,
      summary: hits.map((hit) => ({
        docId: hit.docId,
        score: hit.score,
        excerpt: hit.text.slice(0, 160),
      })),
    };
  }
}
