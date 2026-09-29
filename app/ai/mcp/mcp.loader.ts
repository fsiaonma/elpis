import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { ToolDefinition } from '../tool/tool.interface';
import { loadMcpConfig } from './internal/load-mcp-config';
import { McpClient } from './mcp.client';
import { McpToolDescriptor } from './mcp.types';

export interface LoadedMcpServer {
  serverName: string;
  client: McpClient;
  tools: ToolDefinition[];
}

function toToolDefinition(
  descriptor: McpToolDescriptor,
  client: McpClient,
): ToolDefinition {
  return {
    name: descriptor.name,
    description: descriptor.description ?? '',
    inputSchema: descriptor.inputSchema,
    source: 'mcp',
    execute: (input: unknown) => client.callTool(descriptor.name, input),
  };
}

@Injectable()
export class McpLoader {
  private loaded: LoadedMcpServer[] = [];

  constructor(private readonly configService: ConfigService) {}

  async load(): Promise<LoadedMcpServer[]> {
    await this.closeAll();

    const config = loadMcpConfig(this.configService);
    if (!config.enabled || config.servers.length === 0) {
      this.loaded = [];
      return [];
    }

    const loaded: LoadedMcpServer[] = [];

    for (const server of config.servers) {
      const client = new McpClient(server);
      await client.connect();
      const descriptors = await client.listTools();
      const tools = descriptors.map((descriptor) =>
        toToolDefinition(descriptor, client),
      );

      loaded.push({
        serverName: server.name,
        client,
        tools,
      });
    }

    this.loaded = loaded;
    return loaded;
  }

  async closeAll(): Promise<void> {
    const clients = this.loaded.map((entry) => entry.client.close());
    await Promise.allSettled(clients);
    this.loaded = [];
  }
}
