import { Injectable, OnModuleInit } from '@nestjs/common';
import path from 'path';
import glob from 'glob';
import { SkillDefinition } from './skill.interface';

function isSkillDefinition(value: unknown): value is SkillDefinition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const skill = value as Record<string, unknown>;
  return (
    typeof skill.name === 'string' &&
    typeof skill.description === 'string' &&
    typeof skill.inputSchema === 'object' &&
    skill.inputSchema !== null &&
    typeof skill.execute === 'function'
  );
}

@Injectable()
export class SkillScannerService implements OnModuleInit {
  private readonly skills = new Map<string, SkillDefinition>();

  onModuleInit(): void {
    this.scan();
  }

  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  toToolsPayload(): Record<string, unknown>[] {
    return [...this.skills.values()].map((skill) => ({
      type: 'function',
      function: {
        name: skill.name,
        description: skill.description,
        parameters: skill.inputSchema,
      },
    }));
  }

  private scan(): void {
    const pattern = path.join(process.cwd(), 'dist/skills/**/*.skill.js');
    const files = glob.sync(pattern);

    for (const file of files) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        const mod = require(file) as { default?: unknown };
        const skill = mod.default ?? mod;

        if (!isSkillDefinition(skill)) {
          console.warn(`[SkillScanner] skip invalid skill: ${file}`);
          continue;
        }

        this.skills.set(skill.name, skill);
      } catch (error) {
        console.warn(`[SkillScanner] failed to load: ${file}`, error);
      }
    }

    console.log('[SkillScanner] registered skills:', [...this.skills.keys()]);
  }
}
