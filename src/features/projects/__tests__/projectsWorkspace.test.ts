import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { planningFixture } from './planningFixture';
import { projectsWorkspaceEnabled, projectsWorkspaceEditingEnabled, requirementRows } from '../projectsWorkspaceContract';
import { draftIssues, planningContent } from '../projectDraft';
import { SelectionQuantities } from '../SelectionQuantities';
import type { ProductTemplateVersion } from '../../../entity/ProductTemplateVersion';
import { ProjectsWorkspace } from '../ProjectsWorkspace';
import { ProjectStages } from '../ProjectStages';

describe('Projects workspace evidence', () => {
  it('requires explicit editing opt-in in addition to the tenant workspace flag', () => {
    const env = { NODE_ENV: 'test', PROJECTS_WORKSPACE_READ_ONLY: 'true', PROJECTS_WORKSPACE_ORGANIZATIONS: 'a', PROJECTS_WORKSPACE_EDITING: 'true' };
    expect(projectsWorkspaceEditingEnabled('a', env)).toBe(true);
    expect(projectsWorkspaceEditingEnabled('b', env)).toBe(false);
    expect(projectsWorkspaceEditingEnabled('a', { ...env, PROJECTS_WORKSPACE_EDITING: undefined })).toBe(false);
    expect(projectsWorkspaceEditingEnabled('a', { ...env, PROJECTS_WORKSPACE_READ_ONLY: 'false' })).toBe(false);
  });
  it('validates explicit bundles and reasoned overrides without changing persisted content', () => {
    const f = planningFixture(), versions = [f.version as ProductTemplateVersion];
    const original = structuredClone(f.content);
    const draft = planningContent({ ...f.content, id: 'project', revision: 2, updated_at: '' });
    expect(draft).toEqual(original); expect(draft).not.toBe(f.content);
    expect(draftIssues(draft, versions)).toEqual([]);
    delete draft.sites[0].selections[0].context.complete_sets;
    expect(draftIssues(draft, versions).length).toBeGreaterThan(0);
    expect(f.content).toEqual(original);
    expect(draftIssues(original, []).join(' ')).toContain('unavailable');
  });
  it('renders unknown grade quantities as blank and preserves explicit zero', () => {
    const f = planningFixture();
    const html = renderToStaticMarkup(React.createElement(SelectionQuantities, { subjects: f.subjects, value: f.content.sites[1].selections[0].context, preserveUnknown: true, onChange: () => {} }));
    expect(html).toContain('Unknown / not provided');
    expect(html).toContain('value=""'); expect(html).toContain('value="0"');
    expect(html).toContain('Site overrides');
  });
  it('requires a separate development flag and exact tenant allowlist', () => {
    const env = { NODE_ENV: 'development', PROJECTS_WORKSPACE_READ_ONLY: 'true', PROJECTS_WORKSPACE_ORGANIZATIONS: 'tenant-a, tenant-b' };
    expect(projectsWorkspaceEnabled('tenant-a', env)).toBe(true);
    for (const org of ['', 'tenant', 'tenant-c']) expect(projectsWorkspaceEnabled(org, env)).toBe(false);
    expect(projectsWorkspaceEnabled('tenant-a', { ...env, NODE_ENV: 'production' })).toBe(false);
    expect(projectsWorkspaceEnabled('tenant-a', { ...env, PROJECTS_WORKSPACE_READ_ONLY: 'false' })).toBe(false);
  });
  it('preserves each school grade and explicit crate quantity without inferring bundles or mathematics', () => {
    const f = planningFixture();
    const rows = requirementRows(f.content, [f.version as ProductTemplateVersion]);
    const a = rows.filter(r => r.site === f.content.sites[0].id), b = rows.filter(r => r.site === f.content.sites[1].id);
    expect(a.filter(r => r.subject === 'Science' && !r.grade.includes('bundle')).map(r => r.quantity)).toEqual([2, 2, 2]);
    expect(b.filter(r => r.subject === 'Science' && !r.grade.includes('bundle')).map(r => r.quantity)).toEqual([3, undefined, undefined]);
    expect(a.find(r => r.grade.includes('bundle'))?.complete).toBe(2);
    expect(b.find(r => r.grade.includes('bundle'))?.complete).toBe(0);
    expect(rows.filter(r => r.subject === 'Mathematics').every(r => r.quantity === undefined && r.complete === undefined)).toBe(true);
    delete f.content.sites[0].selections[0].context.complete_sets;
    expect(requirementRows(f.content, [f.version as ProductTemplateVersion]).find(r => r.grade.includes('bundle'))?.complete).toBeUndefined();
  });
  it('represents missing version relationships as unknown rather than zero', () => {
    const f = planningFixture(), before = structuredClone(f.content);
    expect(requirementRows(f.content, [])[0]).toMatchObject({ kit: 'Version unavailable', subject: 'Unknown' });
    expect(requirementRows(f.content, []).filter(r => r.site === f.content.sites[0].id && r.quantity !== undefined).map(r => r.quantity)).toEqual([2, 2, 2]);
    expect(requirementRows(f.content, []).find(r => r.site === f.content.sites[1].id && r.complete !== undefined)?.complete).toBe(0);
    expect(f.content).toEqual(before);
  });
  it('renders labeled read-only navigation and honest stage loading without a browser', () => {
    const html = renderToStaticMarkup(React.createElement(ProjectsWorkspace));
    expect(html).toContain('Projects and Schools workspace');
    expect(html).toContain('Search projects');
    expect(html).toContain('No actions in this workspace change records.');
    expect(html).not.toMatch(/<form|Approve|Create project|Save changes/);
    expect(renderToStaticMarkup(React.createElement(ProjectStages, { project: 'p', site: 's', revision: 1 }))).toContain('Loading authorized stage evidence');
  });
});
