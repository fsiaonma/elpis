import { ModuleRef } from '@nestjs/core';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: unknown): Promise<unknown>;
  source?: 'builtin' | 'mcp';
}

export type BuiltinToolFactory = (deps: {
  moduleRef: ModuleRef;
}) => ToolDefinition;

export type ToolListItem = Pick<
  ToolDefinition,
  'name' | 'description' | 'inputSchema' | 'source'
>;
