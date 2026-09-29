declare module 'glob' {
  function sync(pattern: string, options?: Record<string, unknown>): string[];
}
