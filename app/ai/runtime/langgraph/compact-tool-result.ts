const MODEL_TEXT_LIMIT = 60;
const MODEL_PAYLOAD_LIMIT = 2400;
const RAG_HIT_TEXT_LIMIT = 500;
const RAG_EXCERPT_LIMIT = 120;
const DROPPED_KEYS = new Set([
  'raw_text',
  'highlights',
  'description',
  'jd_text',
  'resumeText',
]);

function clipModelText(value: string): string {
  if (value.length <= MODEL_TEXT_LIMIT) {
    return value;
  }
  return `${value.slice(0, 40)}…`;
}

function clipRagText(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}…`;
}

function compactInvokeAgentResult(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const record = result as Record<string, unknown>;
  if (typeof record.runId === 'string' && typeof record.output === 'string') {
    return {
      runId: record.runId,
      output: record.output,
    };
  }

  if (record.ok === false && record.error !== undefined) {
    return {
      ok: false,
      error: compactToolErrorForModel(record.error),
    };
  }

  return null;
}

function compactRetrieveResult(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const record = result as {
    hits?: Array<{ docId?: string; text?: string; score?: number }>;
  };

  if (!Array.isArray(record.hits)) {
    return null;
  }

  const byLevel = new Map<string, (typeof record.hits)[number]>();
  for (const hit of record.hits) {
    const docId = typeof hit.docId === 'string' ? hit.docId : '';
    const level = docId.match(/#(L[1-5])$/)?.[1] ?? '';
    if (!level || byLevel.has(level)) {
      continue;
    }
    byLevel.set(level, hit);
  }

  const selected =
    byLevel.size > 0
      ? (['L1', 'L2', 'L3', 'L4', 'L5'] as const).flatMap((level) => {
          const hit = byLevel.get(level);
          return hit ? [hit] : [];
        })
      : record.hits.slice(0, 5);

  return {
    hits: selected.map((hit) => {
      const excerptSource = typeof hit.text === 'string' ? hit.text : '';
      return {
        docId: hit.docId,
        excerpt: excerptSource
          ? clipRagText(excerptSource, RAG_EXCERPT_LIMIT)
          : undefined,
      };
    }),
  };
}

function compactArray(value: unknown[], depth: number): unknown {
  const objects = value.filter(
    (item): item is Record<string, unknown> =>
      !!item && typeof item === 'object' && !Array.isArray(item),
  );

  if (
    objects.length === value.length &&
    objects.length > 0 &&
    objects.every(
      (item) =>
        typeof item.docId !== 'string' &&
        (typeof item.requirementId === 'string' || typeof item.threshold === 'string'),
    )
  ) {
    return { requirementCount: objects.length };
  }

  if (
    objects.length === value.length &&
    objects.length > 0 &&
    objects.every((item) => typeof item.jobId === 'string')
  ) {
    return objects.slice(0, 20).map((item) => ({
      jobId: item.jobId,
      title:
        typeof item.title === 'string' ? clipModelText(item.title) : undefined,
    }));
  }

  if (
    objects.length === value.length &&
    objects.length > 0 &&
    objects.every((item) => typeof item.id === 'string')
  ) {
    return objects.slice(0, 24).map((item) => ({
      id: item.id,
      docId: typeof item.docId === 'string' ? item.docId : undefined,
      score: typeof item.score === 'number' ? item.score : undefined,
      text:
        typeof item.text === 'string'
          ? clipRagText(item.text, RAG_HIT_TEXT_LIMIT)
          : undefined,
    }));
  }

  const head = value.slice(0, 8).map((item) => compactForModel(item, depth + 1));
  if (value.length > 8) {
    return { count: value.length, head };
  }
  return head;
}

function compactForModel(value: unknown, depth: number): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      depth < 4 &&
      (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
      trimmed.length > MODEL_TEXT_LIMIT
    ) {
      try {
        return compactForModel(JSON.parse(trimmed) as unknown, depth + 1);
      } catch {
        return clipModelText(value);
      }
    }
    return clipModelText(value);
  }

  if (Array.isArray(value)) {
    return compactArray(value, depth);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (record.basic && typeof record.basic === 'object') {
    const basic = record.basic as Record<string, unknown>;
    return { name: basic.name ?? null, fields: Object.keys(record) };
  }

  const compact: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    if (DROPPED_KEYS.has(key)) {
      continue;
    }
    if (key === 'excerpt' && typeof item === 'string') {
      compact[key] = clipRagText(item, RAG_EXCERPT_LIMIT);
      continue;
    }
    compact[key] = compactForModel(item, depth + 1);
  }
  return compact;
}

function idsOnly(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => idsOnly(item));
  }
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? clipModelText(value) : value;
  }

  const record = value as Record<string, unknown>;
  const kept: Record<string, unknown> = {};
  for (const key of [
    'jobId',
    'id',
    'docId',
    'title',
    'ok',
    'scanned',
    'count',
    'name',
    'requirementCount',
  ]) {
    if (key in record) {
      kept[key] = idsOnly(record[key]);
    }
  }
  if (typeof record.excerpt === 'string') {
    kept.excerpt = clipRagText(record.excerpt, RAG_EXCERPT_LIMIT);
  } else if (typeof record.text === 'string' && typeof record.docId === 'string') {
    kept.excerpt = clipRagText(record.text, RAG_EXCERPT_LIMIT);
  }
  if (Object.keys(kept).length > 0) {
    return kept;
  }
  return { fields: Object.keys(record).slice(0, 8) };
}

export function compactToolResultForModel(result: unknown): unknown {
  return (
    compactInvokeAgentResult(result) ??
    compactRetrieveResult(result) ??
    compactForModel(result, 0)
  );
}

export function compactToolErrorForModel(error: unknown): unknown {
  return compactForModel(error, 0);
}

export function observeToolResult(success: boolean, result: unknown, error: unknown): string {
  const payload = success
    ? { ok: true, result: compactToolResultForModel(result) }
    : { ok: false, error: compactToolErrorForModel(error) };
  const text = JSON.stringify(payload);
  if (text.length <= MODEL_PAYLOAD_LIMIT) {
    return text;
  }
  return JSON.stringify({
    ok: success,
    note: '结果过长，只保留下一个 tool 要用的 id',
    result: idsOnly(payload),
  });
}
