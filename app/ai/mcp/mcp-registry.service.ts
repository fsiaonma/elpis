import { Injectable } from '@nestjs/common';
import { ToolRegistryService } from '../tool/tool-registry.service';
import { LoadedMcpServer } from './mcp.loader';

@Injectable()
export class McpRegistryService {
  registerAll(toolRegistry: ToolRegistryService, loaded: LoadedMcpServer[]): void {
    for (const entry of loaded) {
      const toolNames: string[] = [];

      for (const tool of entry.tools) {
        if (tool.source !== 'mcp') {
          throw new Error(
            `MCP tool "${tool.name}" must have source "mcp", got "${tool.source ?? 'undefined'}"`,
          );
        }

        toolRegistry.register(tool);
        toolNames.push(tool.name);
      }

      console.log(
        `[McpRegistry] server "${entry.serverName}" registered tools:`,
        toolNames,
      );
    }
  }
}
