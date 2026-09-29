import { DynamicModule, INestApplication, Module, Type } from '@nestjs/common';
import { Module as NodeModule } from 'module';
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import { AiModule } from './ai/ai.module';
import { FallbackModule } from './common/fallback/fallback.module';
import { applyStaticAssets } from './common/middleware';
import { ExtendModule } from './extend/extend.module';
import { ProjectModule } from './modules/project/project.module';
import { ViewModule } from './modules/view/view.module';

const runtimeRequire = createRequire(__filename);

function ensureDemoModuleResolution(): void {
  const elpisNodeModules = path.resolve(__dirname, '..', 'node_modules');
  const currentNodePath = process.env.NODE_PATH ?? '';
  if (!currentNodePath.split(path.delimiter).includes(elpisNodeModules)) {
    process.env.NODE_PATH = [currentNodePath, elpisNodeModules]
      .filter(Boolean)
      .join(path.delimiter);
    (NodeModule as typeof NodeModule & { _initPaths(): void })._initPaths();
  }
}

function findModuleFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findModuleFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.module.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

function loadBusinessModule(filePath: string): Type<unknown> | undefined {
  try {
    ensureDemoModuleResolution();
    const loaded = runtimeRequire(filePath) as Record<string, unknown>;
    for (const value of Object.values(loaded)) {
      if (typeof value === 'function' && value.name.endsWith('Module')) {
        return value as Type<unknown>;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function scanBusinessModules(): Type<unknown>[] {
  const modulesRoot = path.resolve(process.cwd(), 'dist/modules');
  const moduleFiles = findModuleFiles(modulesRoot).sort();
  return moduleFiles
    .map((filePath) => loadBusinessModule(filePath))
    .filter((item): item is Type<unknown> => item !== undefined);
}

function buildElpisImports(): Type<unknown>[] {
  return [
    ExtendModule,
    ProjectModule,
    ViewModule,
    AiModule,
    ...scanBusinessModules(),
    FallbackModule,
  ];
}

@Module({
  imports: buildElpisImports(),
})
export class ElpisModule {
  static register(): DynamicModule {
    return {
      module: ElpisModule,
      imports: buildElpisImports(),
    };
  }

  static configureStatic(app: INestApplication): void {
    applyStaticAssets(app);
  }
}
