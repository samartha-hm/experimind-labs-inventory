import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { InventoryReportsView } from '../PredictiveAnalyticsTab';

vi.mock('@/src/DataContext', () => ({ useData: vi.fn() }));

describe('inventory report availability', () => {
  it('offers retry and shows the last successful response time without claiming live stock', () => {
    const html = renderToStaticMarkup(React.createElement(InventoryReportsView, {
      inventory: [], loading: false, error: 'Inventory unavailable',
      loadedAt: '2026-11-09T10:00:00.000Z', onRefresh: async () => {},
    }));
    expect(html).toContain('Retry inventory load');
    expect(html).toContain('dateTime="2026-11-09T10:00:00.000Z"');
    expect(html).toContain('not verified completeness or live stock freshness');
    expect(html).not.toContain('<dl');
  });

  it('hides previous counts while refreshing and disables duplicate refresh clicks', () => {
    const html = renderToStaticMarkup(React.createElement(InventoryReportsView, {
      inventory: [], loading: false, refreshing: true, onRefresh: async () => {},
    }));
    expect(html).toContain('Refreshing…');
    expect(html).toContain('disabled');
    expect(html).not.toContain('<dl');
  });
  it('shows a failed load as an alert without presenting zero-stock counts', () => {
    const html = renderToStaticMarkup(React.createElement(InventoryReportsView, { inventory: [], loading: false, error: 'Inventory unavailable' }));
    expect(html).toContain('role="alert"');
    expect(html).toContain('Inventory unavailable');
    expect(html).not.toContain('<dl');
    expect(html).not.toContain('No inventory records are loaded');
  });

  it('keeps loading separate from a successfully loaded empty snapshot', () => {
    const loading = renderToStaticMarkup(React.createElement(InventoryReportsView, { inventory: [], loading: true }));
    expect(loading).toContain('Loading inventory snapshot');
    expect(loading).not.toContain('<dl');
    const empty = renderToStaticMarkup(React.createElement(InventoryReportsView, { inventory: [], loading: false }));
    expect(empty).toContain('<dl');
    expect(empty).toContain('No inventory records are loaded');
    expect(empty).not.toContain('role="alert"');
  });
});
