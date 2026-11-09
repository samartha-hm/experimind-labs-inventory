import { describe, expect, it } from 'vitest';
import { createLatestRequestGuard, parseStockNumber } from '../latestRequest';

describe('latest inventory request', () => {
  it('ignores a slow response after a newer request finishes', async () => {
    const guard = createLatestRequestGuard();
    let finishOld!: (value: string) => void;
    const pending = new Promise<string>(resolve => { finishOld = resolve; });
    let snapshot = '';
    const oldCurrent = guard.begin();
    const old = pending.then(value => { if (oldCurrent()) snapshot = value; });
    const newCurrent = guard.begin();
    if (newCurrent()) snapshot = 'new account snapshot';
    finishOld('obsolete snapshot');
    await old;
    expect(snapshot).toBe('new account snapshot');
  });

  it('invalidates pending success and failure handlers during cleanup', () => {
    const guard = createLatestRequestGuard();
    const current = guard.begin();
    guard.invalidate();
    expect(current()).toBe(false);
    const next = guard.begin();
    expect(next()).toBe(true);
    expect(current()).toBe(false);
  });
});

describe('recorded stock normalization', () => {
  it.each([null, undefined, '', '  ', false, {}, 'unknown', Infinity, 'Infinity', NaN])('keeps invalid stock %s visible for review', value => {
    expect(parseStockNumber(value)).toBeNaN();
  });
  it.each([[0, 0], ['0', 0], [' 2.5 ', 2.5], [-1, -1]])('preserves numeric stock %s', (value, expected) => {
    expect(parseStockNumber(value)).toBe(expected);
  });
});
