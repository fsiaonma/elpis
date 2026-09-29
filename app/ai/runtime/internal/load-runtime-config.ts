import { ConfigService } from '../../../config/config.service';

const DEFAULT_MAX_ITERATIONS = 5;

function getRuntimeConfig(configService: ConfigService): { maxIterations?: unknown } {
  const ai = configService.get('ai') as { runtime?: { maxIterations?: unknown } } | undefined;
  return ai?.runtime ?? {};
}

export function resolveMaxIterations(configService: ConfigService): number {
  const { maxIterations } = getRuntimeConfig(configService);
  const parsed =
    typeof maxIterations === 'number'
      ? maxIterations
      : typeof maxIterations === 'string'
        ? Number(maxIterations)
        : NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_ITERATIONS;
  }

  return Math.floor(parsed);
}
