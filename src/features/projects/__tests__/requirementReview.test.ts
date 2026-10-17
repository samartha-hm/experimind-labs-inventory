import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RequirementReview, requirementChanges } from '../RequirementReview';
import { planningFixture } from './planningFixture';
import type { ProjectsWorkspaceDetail } from '../projectsWorkspaceContract';

describe('Saved requirement review', () => {
  it('matches schools by identity across reordering and preserves explicit zero versus unknown', () => {
    const before = planningFixture().content, after = structuredClone(before);
    after.sites.reverse();
    expect(requirementChanges(before, after)).toEqual([]);
    const selected = after.sites[1], grade = Object.keys(selected.selections[0].context.grade_quantities)[0];
    selected.selections[0].context.grade_quantities[grade] = 0;
    selected.notes = '<script>unsafe</script>';
    const changes = requirementChanges(before, after);
    expect(changes).toHaveLength(2);
    expect(changes.every(c => c.field.includes(selected.id))).toBe(true);
    expect(changes.find(c => c.field.endsWith(grade))).toMatchObject({ before: '2', after: '0' });
    expect(requirementChanges(undefined, 0)).toEqual([{ field: '', before: 'Not recorded', after: '0' }]);
    expect(before.sites[0].notes).toBe('');
  });
  it('exposes kit revision, complete-set and reason changes without calculating material demand', () => {
    const before = planningFixture().content, after = structuredClone(before);
    const selection = after.sites[0].selections[0];
    selection.version_id = 'different-approved-version';
    selection.context.complete_sets = { explicit: 0 };
    selection.context.overrides = { crate: { quantity: 2, reason: 'School-specific review' } };
    const changes = requirementChanges(before.sites[0], after.sites[0]);
    expect(changes.some(c => c.field.endsWith('version_id'))).toBe(true);
    expect(changes.some(c => c.field.endsWith('complete_sets / explicit') && c.after === '0')).toBe(true);
    expect(changes.some(c => c.field.endsWith('reason') && c.after.includes('School-specific review'))).toBe(true);
  });
  it('compares newly added schools field by field and escapes review content', () => {
    const content = planningFixture().content;
    content.sites[0].name = '<script>School</script>';
    const previous = { ...structuredClone(content), sites: [content.sites[1]] };
    const detail = { project: { ...content, id: 'project', revision: 2 }, history: [
      { revision: 2, updated_by: 'actor-two', created_at: 'today', content },
      { revision: 1, updated_by: 'actor-one', created_at: 'yesterday', content: previous },
    ] } as ProjectsWorkspaceDetail;
    const html = renderToStaticMarkup(React.createElement(RequirementReview, { detail, content, revision: 2, school: content.sites[0].id }));
    expect(html).toContain('Requirement approval unavailable');
    expect(html).toContain('actor-two'); expect(html).toContain('actor-one');
    expect(html).toContain('&lt;script&gt;School&lt;/script&gt;');
    expect(html).not.toMatch(/<script>|<form|<button[^>]*>Approve/);
    expect(requirementChanges(undefined, content.sites[0]).length).toBeGreaterThan(5);
  });
  it('handles missing baseline evidence and bounds large school comparisons', () => {
    const content = planningFixture().content;
    const detail = { project: { ...content, id: 'project', revision: 1 }, history: [] } as unknown as ProjectsWorkspaceDetail;
    const html = renderToStaticMarkup(React.createElement(RequirementReview, { detail, content, revision: 1, school: '' }));
    expect(html).toContain('No earlier saved revision');
    expect(html).toContain('Revision actor evidence unavailable');
    const previous = structuredClone(content);
    content.sites[0].selections[0].context.grade_quantities = Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`grade-${i}`, i]));
    detail.history = [{ revision: 1, updated_by: 'actor', created_at: 'date', archived: false, content: previous }];
    const large = renderToStaticMarkup(React.createElement(RequirementReview, { detail, content, revision: 2, school: content.sites[0].id }));
    expect(large).toContain('Show all 153 changes');
    expect(large).not.toContain('grade-149');
  });
});
