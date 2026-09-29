import { ConfigService } from '../../../config/config.service';

const DEFAULT_MAX_ITERATIONS = 5;
const DEFAULT_MAX_DELEGATION_DEPTH = 2;

function getRuntimeConfig(configService: ConfigService): {
  maxIterations?: unknown;
  maxDelegationDepth?: unknown;
} {
  const ai = configService.get('ai') as
    | { runtime?: { maxIterations?: unknown; maxDelegationDepth?: unknown } }
    | undefined;
  return ai?.runtime ?? {};
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function resolveMaxIterations(configService: ConfigService): number {
  const { maxIterations } = getRuntimeConfig(configService);
  return parsePositiveInt(maxIterations, DEFAULT_MAX_ITERATIONS);
}

export function resolveMaxDelegationDepth(configService: ConfigService): number {
  const { maxDelegationDepth } = getRuntimeConfig(configService);
  return parsePositiveInt(maxDelegationDepth, DEFAULT_MAX_DELEGATION_DEPTH);
}

export function resolveRecursionLimit(configService: ConfigService): number {
  const maxIterations = resolveMaxIterations(configService);
  return maxIterations * 3 + 5;
}
