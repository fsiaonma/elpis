import { Injectable, OnModuleInit } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import { AgentDefinition } from './agent.interface';

function isAgentDefinition(value: unknown): value is AgentDefinition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const agent = value as Record<string, unknown>;
  const hasPrompt =
    typeof agent.prompt === 'string' || typeof agent.promptFile === 'string';

  return (
    typeof agent.name === 'string' &&
    Array.isArray(agent.skills) &&
    Array.isArray(agent.tools) &&
    hasPrompt
  );
}

function resolvePrompt(agent: AgentDefinition, agentFile: string): string {
  if (typeof agent.prompt === 'string') {
    return agent.prompt;
  }

  if (typeof agent.promptFile === 'string') {
    const promptPath = path.resolve(path.dirname(agentFile), agent.promptFile);
    return fs.readFileSync(promptPath, 'utf-8');
  }

  return '';
}

@Injectable()
export class AgentScannerService implements OnModuleInit {
  private readonly agents = new Map<string, AgentDefinition>();

  onModuleInit(): void {
    this.scan();
  }

  get(name: string): AgentDefinition | undefined {
    return this.agents.get(name);
  }

  list(): AgentDefinition[] {
    return [...this.agents.values()];
  }

  private scan(): void {
    const pattern = path.join(process.cwd(), 'dist/agents/**/*.agent.js');
    const files = glob.sync(pattern);

    for (const file of files) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        const mod = require(file) as { default?: unknown };
        const raw = mod.default ?? mod;

        if (!isAgentDefinition(raw)) {
          console.warn(`[AgentScanner] skip invalid agent: ${file}`);
          continue;
        }

        const agent: AgentDefinition = {
          ...raw,
          prompt: resolvePrompt(raw, file),
        };
        delete agent.promptFile;

        this.agents.set(agent.name, agent);
      } catch (error) {
        console.warn(`[AgentScanner] failed to load: ${file}`, error);
      }
    }

    console.log('[AgentScanner] registered agents:', [...this.agents.keys()]);
  }
}
