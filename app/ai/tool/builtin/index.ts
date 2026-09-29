import invokeAgentTool from './invoke-agent.tool';
import retrieveTool from './retrieve.tool';
import { BuiltinToolFactory } from '../tool.interface';

export const builtinTools: BuiltinToolFactory[] = [retrieveTool, invokeAgentTool];
