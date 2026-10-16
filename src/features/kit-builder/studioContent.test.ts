import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StudioContent } from './LiveKitStudio';
import type { KitSubject } from '../../entity/ProductTemplateVersion';

describe('Live Studio component', () => {
  it('distinguishes unavailable structure from an empty persisted kit', () => {
    expect(renderToStaticMarkup(React.createElement(StudioContent, { snapshot: {} }))).toContain('Educational structure unavailable');
    expect(renderToStaticMarkup(React.createElement(StudioContent, { snapshot: { subjects: [] } }))).toContain('This kit is empty');
  });
  it('renders dense education separately from physical mappings without edit controls', () => {
    const material = { id: 'm', inventory_item_id: 'item', item_name: 'Long material '.repeat(40), quantity: 0, unit: 'pcs', reusable: true };
    const subjects: KitSubject[] = [{ id: 's', name: 'Science', grades: [{ id: 'g', name: 'Grade 8', activities: [{ id: 'a', name: 'Educational activity', materials: [material] }, { id: 'empty', name: 'Missing materials', materials: [] }], packing: [{ id: 'box', kind: 'box', name: 'Physical box', activity_ids: ['a'], inventory_item_ids: ['item'], children: [] }] }], crates: [{ id: 'c', name: 'Universal', kind: 'universal', materials: [{ ...material, complete: false }], rule: { kind: 'complete_sets', components: [{ subject_id: 's', grade_id: 'g', quantity: 1 }] } }] }];
    const html = renderToStaticMarkup(React.createElement(StudioContent, { snapshot: { subjects } }));
    for (const text of ['0 pcs', 'Unavailable — incomplete material', 'Physical box', 'Educational activity', 'Requires explicit complete-set confirmation', 'Calculated quantity traces unavailable', 'No materials configured', 'Packing: Physical box']) expect(html).toContain(text);
    expect(html).not.toMatch(/<button|<input|<form/);
    expect(html).toContain('<summary>');
  });
});
