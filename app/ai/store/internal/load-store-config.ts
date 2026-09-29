import path from 'path';
import { ConfigService } from '../../../config/config.service';

interface VectorStoreConfig {
  path?: string;
  fixturesPath?: string;
  driver?: string;
  url?: string;
  collection?: string;
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

function getVectorStoreConfig(
  configService: ConfigService,
): string | VectorStoreConfig | undefined {
  const store = getStoreConfig(configService);
  return store.vector;
}

export function resolveVectorStoreDriver(configService: ConfigService): string {
  const vector = getVectorStoreConfig(configService);

  if (vector && typeof vector === 'object') {
    const driver = vector.driver?.trim().toLowerCase();
    if (driver) {
      return driver;
    }
  }

  return 'file';
}

export function resolveQdrantVectorStoreUrl(configService: ConfigService): string {
  const vector = getVectorStoreConfig(configService);

  if (
    vector &&
    typeof vector === 'object' &&
    typeof vector.url === 'string' &&
    vector.url.trim() !== ''
  ) {
    return vector.url.trim();
  }

  return 'http://127.0.0.1:6333';
}

export function resolveQdrantCollection(configService: ConfigService): string {
  const vector = getVectorStoreConfig(configService);

  if (
    vector &&
    typeof vector === 'object' &&
    typeof vector.collection === 'string' &&
    vector.collection.trim() !== ''
  ) {
    return vector.collection.trim();
  }

  return 'rubric';
}

export function resolveVectorStorePath(configService: ConfigService): string {
  const vector = getVectorStoreConfig(configService);

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
