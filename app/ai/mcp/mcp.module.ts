import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ToolModule } from '../tool/tool.module';
import { ToolRegistryService } from '../tool/tool-registry.service';
import { McpLoader } from './mcp.loader';
import { McpRegistryService } from './mcp-registry.service';

@Module({
  imports: [ToolModule],
  providers: [McpLoader, McpRegistryService],
  exports: [McpLoader, McpRegistryService],
})
export class McpModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly mcpLoader: McpLoader,
    private readonly mcpRegistryService: McpRegistryService,
    private readonly toolRegistryService: ToolRegistryService,
  ) {}

  async onModuleInit(): Promise<void> {
    const loaded = await this.mcpLoader.load();
    this.mcpRegistryService.registerAll(this.toolRegistryService, loaded);
  }

  async onModuleDestroy(): Promise<void> {
    await this.mcpLoader.closeAll();
  }
}
