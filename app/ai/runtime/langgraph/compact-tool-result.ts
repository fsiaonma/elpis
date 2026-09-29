const MODEL_TEXT_LIMIT = 60;
const MODEL_PAYLOAD_LIMIT = 2400;
const RAG_HIT_TEXT_LIMIT = 500;
const RAG_EXCERPT_LIMIT = 160;
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

function compactRetrieveResult(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const record = result as {
    hits?: Array<{ id?: string; docId?: string; text?: string; score?: number }>;
    summary?: Array<{ docId?: string; score?: number; excerpt?: string }>;
  };

  if (!Array.isArray(record.hits)) {
    return null;
  }

  const summary = Array.isArray(record.summary)
    ? record.summary.map((item) => ({
        docId: item.docId,
        score: item.score,
        excerpt:
          typeof item.excerpt === 'string'
            ? clipRagText(item.excerpt, RAG_EXCERPT_LIMIT)
            : item.excerpt,
      }))
    : record.hits.map((hit) => ({
        docId: hit.docId,
        score: hit.score,
        excerpt:
          typeof hit.text === 'string'
            ? clipRagText(hit.text, RAG_EXCERPT_LIMIT)
            : undefined,
      }));

  return {
    summary,
    hits: record.hits.slice(0, 8).map((hit) => ({
      id: hit.id,
      docId: hit.docId,
      score: hit.score,
      text:
        typeof hit.text === 'string'
          ? clipRagText(hit.text, RAG_HIT_TEXT_LIMIT)
          : hit.text,
    })),
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
  for (const key of ['jobId', 'id', 'title', 'ok', 'scanned', 'count', 'name']) {
    if (key in record) {
      kept[key] = idsOnly(record[key]);
    }
  }
  if (Object.keys(kept).length > 0) {
    return kept;
  }
  return { fields: Object.keys(record).slice(0, 8) };
}

export function compactToolResultForModel(result: unknown): unknown {
  return compactRetrieveResult(result) ?? compactForModel(result, 0);
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
