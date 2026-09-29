import { ConfigService } from '../../../config/config.service';
import { McpConfig, McpServerConfig } from '../mcp.types';

interface RawMcpServerConfig {
  name?: string;
  timeoutMs?: number;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
}

function hasCommand(raw: RawMcpServerConfig): boolean {
  return typeof raw.command === 'string' && raw.command.trim() !== '';
}

function hasUrl(raw: RawMcpServerConfig): boolean {
  return typeof raw.url === 'string' && raw.url.trim() !== '';
}

function normalizeServer(raw: RawMcpServerConfig): McpServerConfig | null {
  const command = hasCommand(raw);
  const url = hasUrl(raw);

  if (!command && !url) {
    return null;
  }

  if (command && url) {
    throw new Error(
      `MCP server "${raw.name ?? '<unnamed>'}" must not declare both command and url`,
    );
  }

  if (typeof raw.name !== 'string' || raw.name.trim() === '') {
    throw new Error('MCP server name is required');
  }

  const server: McpServerConfig = {
    name: raw.name.trim(),
    timeoutMs: raw.timeoutMs,
  };

  if (command) {
    server.command = raw.command!.trim();
    if (Array.isArray(raw.args)) {
      server.args = raw.args;
    }
    if (raw.env && typeof raw.env === 'object') {
      server.env = raw.env;
    }
    if (typeof raw.cwd === 'string' && raw.cwd.trim() !== '') {
      server.cwd = raw.cwd.trim();
    }
    return server;
  }

  server.url = raw.url!.trim();
  if (raw.headers && typeof raw.headers === 'object') {
    server.headers = raw.headers;
  }
  return server;
}

export function loadMcpConfig(configService: ConfigService): McpConfig {
  const ai = configService.get('ai') as
    | { mcp?: { enabled?: boolean; servers?: RawMcpServerConfig[] } }
    | undefined;

  const mcp = ai?.mcp;
  const enabled = mcp?.enabled ?? false;
  const rawServers = Array.isArray(mcp?.servers) ? mcp.servers : [];
  const servers: McpServerConfig[] = [];

  for (const raw of rawServers) {
    const server = normalizeServer(raw);
    if (server) {
      servers.push(server);
    }
  }

  return { enabled, servers };
}
