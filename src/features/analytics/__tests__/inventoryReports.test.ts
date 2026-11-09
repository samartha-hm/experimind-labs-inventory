import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { InventoryReportsView } from '../PredictiveAnalyticsTab';

vi.mock('@/src/DataContext', () => ({ useData: vi.fn() }));

describe('inventory report availability', () => {
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
