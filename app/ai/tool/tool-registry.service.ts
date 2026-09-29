import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { builtinTools } from './builtin';
import { ToolDefinition, ToolListItem } from './tool.interface';

@Injectable()
export class ToolRegistryService implements OnModuleInit {
  private readonly tools = new Map<string, ToolDefinition>();

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    for (const factory of builtinTools) {
      this.register(factory({ moduleRef: this.moduleRef }));
    }

    console.log('[ToolRegistry] registered tools:', this.listNames());
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolListItem[] {
    return [...this.tools.values()].map(({ name, description, inputSchema, source }) => ({
      name,
      description,
      inputSchema,
      source,
    }));
  }

  listNames(): string[] {
    return [...this.tools.keys()];
  }
}
