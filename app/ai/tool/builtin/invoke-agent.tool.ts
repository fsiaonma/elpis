import { ModuleRef } from '@nestjs/core';
import { LangGraphOrchestratorService } from '../../runtime/langgraph/langgraph-orchestrator.service';
import { BuiltinToolFactory } from '../tool.interface';

interface InvokeAgentInput {
  agent?: string;
  input?: unknown;
}

const invokeAgentTool: BuiltinToolFactory = ({ moduleRef }) => ({
  name: 'invoke_agent',
  description:
    'Run another registered agent with the given input and return its runId and final output.',
  source: 'builtin',
  inputSchema: {
    type: 'object',
    properties: {
      agent: {
        type: 'string',
        description: 'Registered agent name to invoke',
      },
      input: {
        type: 'string',
        description: 'Input passed to the delegated agent',
      },
    },
    required: ['agent', 'input'],
  },
  execute: async (raw: unknown) => {
    const { agent, input } = raw as InvokeAgentInput;
    if (typeof agent !== 'string' || agent.trim() === '') {
      return {
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'agent is required',
        },
      };
    }

    const normalizedInput =
      typeof input === 'string' ? input : JSON.stringify(input ?? {});

    const orchestrator = moduleRef.get(LangGraphOrchestratorService, { strict: false });
    return orchestrator.invokeDelegatedAgent(agent.trim(), normalizedInput);
  },
});

export default invokeAgentTool;
