import path from 'path';
import { ConfigService } from '../../../config/config.service';

interface VectorStoreConfig {
  path?: string;
  fixturesPath?: string;
}

interface StoreConfig {
  trace?: string;
  vector?: string | VectorStoreConfig;
}

function getStoreConfig(configService: ConfigService): StoreConfig {
  const ai = configService.get('ai') as { store?: StoreConfig } | undefined;
  return ai?.store ?? {};
}

export function resolveTraceStorePath(configService: ConfigService): string {
  const store = getStoreConfig(configService);
  const tracePath = store.trace;

  if (typeof tracePath === 'string' && tracePath.trim() !== '') {
    return path.resolve(tracePath);
  }

  return path.resolve(process.cwd(), '.elpis', 'trace');
}

export function resolveVectorStorePath(configService: ConfigService): string {
  const store = getStoreConfig(configService);
  const vector = store.vector;

  if (typeof vector === 'string' && vector.trim() !== '') {
    return path.resolve(vector);
  }

  if (
    vector &&
    typeof vector === 'object' &&
    typeof vector.path === 'string' &&
    vector.path.trim() !== ''
  ) {
    return path.resolve(vector.path);
  }

  return path.resolve(process.cwd(), '.elpis', 'vector');
}
