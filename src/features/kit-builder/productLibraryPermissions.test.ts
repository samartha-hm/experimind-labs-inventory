import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ProductLibrary, { type DraftKit } from './ProductLibrary';

const auth = vi.hoisted(() => ({ role: 'viewer' }));
vi.mock('../../AuthContext', () => ({ useAuth: () => auth }));
vi.mock('./QuantityPreview', () => ({ QuantityPreview: () => null }));
vi.mock('./RevisionHistory', () => ({ RevisionHistory: () => null }));

const draft: DraftKit = {
  id: 'version', template_id: 'template', name: 'Staff-created kit', description: '', category: '',
  version_number: 1, revision: 1, updated_at: '2026-11-09T00:00:00Z',
  subjects: ['Science', 'Maths'].map(subject => ({
    id: subject, name: subject,
    grades: ['8', '9'].map(grade => ({
      id: `${subject}-${grade}`, name: grade,
      activities: ['Measurement', 'Shapes'].map(activity => ({
        id: `${subject}-${grade}-${activity}`, name: activity, materials: [],
      })),
    })),
  })),
};

describe('Product Library editing permissions', () => {
  it.each(['viewer', 'unknown', ''])('keeps all reorder controls read-only for role "%s"', role => {
    auth.role = role;
    const html = renderToStaticMarkup(React.createElement(ProductLibrary, { studio: { draft, onClose: () => {} } }));
    const controls = html.match(/<button\b[^>]*aria-label="Move [^"]+"[^>]*>/g) ?? [];
    expect(controls).toHaveLength(28);
    expect(controls.filter(control => !control.includes('disabled=""'))).toEqual([]);
    expect(html).not.toContain('Save draft');
  });

  it('retains staff reordering while disabling list boundaries', () => {
    auth.role = 'staff';
    const html = renderToStaticMarkup(React.createElement(ProductLibrary, { studio: { draft, onClose: () => {} } }));
    const controls = html.match(/<button\b[^>]*aria-label="Move [^"]+"[^>]*>/g) ?? [];
    expect(controls.filter(control => !control.includes('disabled=""'))).toHaveLength(14);
    expect(html).toContain('Save draft');
  });
});
