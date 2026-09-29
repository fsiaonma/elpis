import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import {
  LlmMessage,
  PlanAction,
  PlanActionType,
  PlanResult,
} from '../../contracts';
import { SkillScannerService } from '../../skill/skill-scanner.service';
import { ToolRegistryService } from '../../tool/tool-registry.service';
import { resolveLlm } from '../internal/load-llm-config';
import {
  buildAgentStructuredTools,
  buildAgentToolJsonSchemas,
} from './skill-tool.adapter';

export interface LangChainPlannerContext {
  skillNames: Set<string>;
  toolNames: Set<string>;
  model?: string;
}

@Injectable()
export class LangChainPlannerService {
  constructor(
    private readonly configService: ConfigService,
    private readonly skillScannerService: SkillScannerService,
    private readonly toolRegistryService: ToolRegistryService,
  ) {}

  async plan(
    messages: LlmMessage[],
    context: LangChainPlannerContext,
  ): Promise<PlanResult> {
    const tools = buildAgentStructuredTools(
      this.skillScannerService,
      this.toolRegistryService,
      context.skillNames,
      context.toolNames,
    );
    const toolJsonSchemas = buildAgentToolJsonSchemas(
      this.skillScannerService,
      this.toolRegistryService,
      context.skillNames,
      context.toolNames,
    );

    const resolved = resolveLlm(this.configService, context.model);

    if (resolved.kind === 'langchain') {
      const llmWithTools = tools.length > 0 ? resolved.model.bindTools(tools) : resolved.model;
      const response = await llmWithTools.invoke(toLangChainMessages(messages));
      return this.toPlanResult(response as AIMessage, context);
    }

    const response = await resolved.provider.chat(messages, {
      model: context.model,
      tools: toolJsonSchemas.length > 0 ? toolJsonSchemas : undefined,
    });
    return this.toPlanResultFromLlmMessage(response, context);
  }

  private toPlanResult(response: AIMessage, context: LangChainPlannerContext): PlanResult {
    const llmMessage = fromAIMessage(response);

    const fromToolCalls = this.parseToolCalls(response, context);
    if (fromToolCalls) {
      const call = response.tool_calls?.[0];
      return {
        action: fromToolCalls,
        response: llmMessage,
        toolCallId: call?.id ?? crypto.randomUUID(),
      };
    }

    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content ?? '');

    if (content.trim()) {
      return {
        action: { type: 'final', output: content },
        response: llmMessage,
      };
    }

    return {
      action: { type: 'final', output: content },
      response: llmMessage,
    };
  }

  private toPlanResultFromLlmMessage(
    response: LlmMessage,
    context: LangChainPlannerContext,
  ): PlanResult {
    const fromToolCalls = this.parseLlmToolCalls(response, context);
    if (fromToolCalls) {
      const call = response.tool_calls![0];
      return {
        action: fromToolCalls,
        response,
        toolCallId: call.id ?? crypto.randomUUID(),
      };
    }

    if (response.content.trim()) {
      return {
        action: { type: 'final', output: response.content },
        response,
      };
    }

    return {
      action: { type: 'final', output: response.content },
      response,
    };
  }

  private parseToolCalls(
    response: AIMessage,
    context: LangChainPlannerContext,
  ): PlanAction | null {
    if (!response.tool_calls?.length) {
      return null;
    }

    const call = response.tool_calls[0];
    const name = call.name;
    const args = call.args ?? {};
    const type = this.resolveActionType(name, context) ?? 'tool';

    return { type, name, args };
  }

  private parseLlmToolCalls(
    response: LlmMessage,
    context: LangChainPlannerContext,
  ): PlanAction | null {
    if (!response.tool_calls?.length) {
      return null;
    }

    const call = response.tool_calls[0];
    const name = call.function.name;
    let args: unknown = {};

    try {
      args = JSON.parse(call.function.arguments || '{}');
    } catch {
      args = {};
    }

    const type = this.resolveActionType(name, context) ?? 'tool';
    return { type, name, args };
  }

  private resolveActionType(
    name: string,
    context: LangChainPlannerContext,
  ): PlanActionType | null {
    if (context.skillNames.has(name)) {
      return 'skill';
    }
    if (context.toolNames.has(name)) {
      return 'tool';
    }
    return null;
  }
}

function toLangChainMessages(messages: LlmMessage[]): BaseMessage[] {
  return messages.map((message) => {
    switch (message.role) {
      case 'system':
        return new SystemMessage(message.content);
      case 'assistant':
        return new AIMessage({
          content: message.content,
          tool_calls: message.tool_calls?.map((call) => ({
            id: call.id ?? crypto.randomUUID(),
            name: call.function.name,
            args: parseToolArgs(call.function.arguments),
            type: 'tool_call' as const,
          })),
        });
      case 'tool':
        return new ToolMessage({
          content: message.content,
          tool_call_id: message.tool_call_id ?? '',
        });
      default:
        return new HumanMessage(message.content);
    }
  });
}

function fromAIMessage(message: AIMessage): LlmMessage {
  return {
    role: 'assistant',
    content: typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content ?? ''),
    tool_calls: message.tool_calls?.map((call) => ({
      id: call.id,
      type: 'function',
      function: {
        name: call.name,
        arguments: JSON.stringify(call.args ?? {}),
      },
    })),
  };
}

function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || '{}');
    return typeof parsed === 'object' && parsed !== null
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}
