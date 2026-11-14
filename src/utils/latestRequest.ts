/** Ignore superseded responses and invalidate pending work on effect cleanup. */
export function createLatestRequestGuard() {
  let generation = 0;
  return {
    begin() {
      const request = ++generation;
      return () => request === generation;
    },
    invalidate() { generation++; },
  };
}

/** Missing or malformed recorded stock must not become an apparent zero. */
export function parseStockNumber(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') return NaN;
  if (typeof value === 'string' && !value.trim()) return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}
