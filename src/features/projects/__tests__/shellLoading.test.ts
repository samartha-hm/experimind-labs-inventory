import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProjectPlanningTab from '../ProjectPlanningTab';
import TrustedProductionPanel from '../../production/TrustedProductionPanel';
import TrustedPackingPanel from '../../packing/TrustedPackingPanel';
import TrustedDeliveryPanel from '../../delivery/TrustedDeliveryPanel';

afterEach(() => vi.unstubAllGlobals());

describe('authenticated shell pending evidence', () => {
  it.each([
    [ProjectPlanningTab, 'Loading projects', 'No projects yet.'],
    [TrustedProductionPanel, 'Loading authorized production evidence', 'Trusted production is unavailable'],
    [TrustedPackingPanel, 'Loading authorized packing evidence', 'Trusted packing is unavailable'],
    [TrustedDeliveryPanel, 'Loading authorized delivery evidence', 'Trusted delivery is unavailable'],
  ] as const)('does not claim empty or disabled data before %s loads', (Panel, loading, misleading) => {
    vi.stubGlobal('location', { search: '' });
    const html = renderToStaticMarkup(React.createElement(Panel));
    expect(html).toContain(loading);
    expect(html).not.toContain(misleading);
    expect(html).toContain('role="status"');
  });
});
