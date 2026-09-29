export interface SkillContext {
  [key: string]: unknown;
}

export interface SkillDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: unknown, ctx: SkillContext): Promise<unknown>;
}
