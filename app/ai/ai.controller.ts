import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { BaseController } from '../common/base/base.controller';
import { ConfigService } from '../config/config.service';
import { AgentScannerService } from './agent/agent-scanner.service';
import { resolveThreadEnabled } from './agent/internal/load-agent-config';
import { describeAgentGraph } from './runtime/langgraph/agent.graph';
import { LangGraphOrchestratorService } from './runtime/langgraph/langgraph-orchestrator.service';
import { ToolRegistryService } from './tool/tool-registry.service';
import { TraceService } from './trace/trace.service';

interface AgentRunRequestBody {
  agent?: string;
  input?: unknown;
  threadId?: string;
}

function normalizeAgentRunBody(body: AgentRunRequestBody): {
  agent: string;
  input: unknown;
  threadId?: string;
} {
  if (typeof body.agent !== 'string' || body.agent.trim() === '') {
    throw new HttpException(
      {
        success: false,
        code: 442,
        message: 'request validate fail: agent is required',
      },
      HttpStatus.OK,
    );
  }

  const threadId =
    typeof body.threadId === 'string' && body.threadId.trim() !== ''
      ? body.threadId
      : undefined;

  return {
    agent: body.agent,
    input: body.input ?? {},
    threadId,
  };
}

@Controller('api/ai')
export class AiController extends BaseController {
  constructor(
    private readonly toolRegistryService: ToolRegistryService,
    private readonly agentScannerService: AgentScannerService,
    private readonly langGraphOrchestratorService: LangGraphOrchestratorService,
    private readonly traceService: TraceService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  @Get('tool/list')
  listTools() {
    return this.success(this.toolRegistryService.list());
  }

  @Get('agent/list')
  listAgents() {
    return this.success(this.agentScannerService.list());
  }

  @Get('agent/graph')
  agentGraph() {
    return this.success(describeAgentGraph());
  }

  @Get('agent/config')
  agentConfig() {
    return this.success({
      threadEnabled: resolveThreadEnabled(this.configService),
    });
  }

  @Get('trace/:runId')
  async getTrace(@Param('runId') runId: string) {
    const run = await this.traceService.load(runId);
    if (!run) {
      throw new HttpException(
        {
          success: false,
          code: 40401,
          message: `trace not found: ${runId}`,
        },
        HttpStatus.OK,
      );
    }

    return this.success(run);
  }

  @Post('agent/run')
  async agentRun(@Body() body: AgentRunRequestBody) {
    const { agent, input, threadId } = normalizeAgentRunBody(body);

    try {
      const result = await this.langGraphOrchestratorService.run(agent, input, threadId);
      return this.success(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'agent run failed';
      if (message.startsWith('agent not found:')) {
        throw new HttpException(
          {
            success: false,
            code: 40401,
            message,
          },
          HttpStatus.OK,
        );
      }

      throw new HttpException(
        {
          success: false,
          code: 50000,
          message,
        },
        HttpStatus.OK,
      );
    }
  }

  @Post('agent/run/stream')
  async agentRunStream(@Body() body: AgentRunRequestBody, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { agent, input, threadId } = normalizeAgentRunBody(body);

    try {
      for await (const item of this.langGraphOrchestratorService.streamRun(agent, input, threadId)) {
        if (item.event === 'done') {
          const payload = this.success(item.data);
          res.write(`event: done\ndata: ${JSON.stringify(payload)}\n\n`);
          continue;
        }

        res.write(`event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`);
      }

      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'agent stream failed';
      const payload =
        message.startsWith('agent not found:')
          ? this.fail(message, 40401)
          : this.fail(message, 50000);
      res.write(`event: done\ndata: ${JSON.stringify(payload)}\n\n`);
      res.end();
    }
  }
}
