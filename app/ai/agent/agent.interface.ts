export interface AgentDefinition {
  name: string;
  skills: string[];
  tools: string[];
  prompt?: string;
  promptFile?: string;
  model?: string;
}
