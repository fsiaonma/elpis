import { ConfigService } from '../../../config/config.service';

interface AgentConfig {
  threadEnabled?: unknown;
}

function getAgentConfig(configService: ConfigService): AgentConfig {
  const ai = configService.get('ai') as { agent?: AgentConfig } | undefined;
  return ai?.agent ?? {};
}

export function resolveThreadEnabled(configService: ConfigService): boolean {
  const agent = getAgentConfig(configService);
  return agent.threadEnabled === true;
}
