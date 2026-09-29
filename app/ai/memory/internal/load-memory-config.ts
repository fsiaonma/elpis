import path from 'path';
import { ConfigService } from '../../../config/config.service';

interface MemoryConfig {
  path?: string;
  maxTurns?: unknown;
}

interface StoreConfig {
  memory?: MemoryConfig;
}

const DEFAULT_MAX_TURNS = 20;

function getMemoryConfig(configService: ConfigService): MemoryConfig {
  const ai = configService.get('ai') as { store?: StoreConfig } | undefined;
  return ai?.store?.memory ?? {};
}

export function resolveMemoryPath(configService: ConfigService): string {
  const memory = getMemoryConfig(configService);
  const memoryPath = memory.path;

  if (typeof memoryPath === 'string' && memoryPath.trim() !== '') {
    return path.resolve(memoryPath);
  }

  return path.resolve(process.cwd(), '.elpis', 'memory');
}

export function resolveMemoryMaxTurns(configService: ConfigService): number {
  const memory = getMemoryConfig(configService);
  const maxTurns = memory.maxTurns;

  if (typeof maxTurns === 'number' && Number.isFinite(maxTurns) && maxTurns > 0) {
    return Math.floor(maxTurns);
  }

  return DEFAULT_MAX_TURNS;
}
