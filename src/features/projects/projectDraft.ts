import type { PlanningContent, PlanningView } from './planningTypes';
import type { ProductTemplateVersion } from '../../entity/ProductTemplateVersion';
import { previewQuantities } from '../kit-builder/quantityRules';

export function planningContent(view: PlanningView): PlanningContent {
  const { id: _id, revision: _revision, updated_at: _updated, ...content } = view;
  return structuredClone(content);
}
/** Validation only; material demand always comes from the server. */
export function draftIssues(content: PlanningContent, versions: ProductTemplateVersion[]): string[] {
  const issues: string[] = [];
  if (!content.name.trim()) issues.push('Project name is required.');
  for (const site of content.sites) {
    if (!site.name.trim()) issues.push('School name is required.');
    if (!site.selections.length) issues.push(`${site.name}: select an approved kit before saving this draft.`);
    for (const selection of site.selections) {
      const version = versions.find(v => v.id === selection.version_id);
      if (!version) { issues.push(`${site.name}: approved kit is unavailable. Reload the catalog.`); continue; }
      try {
        previewQuantities(version.subjects, { ...selection.context, overrides: { ...content.overrides[version.id], ...selection.context.overrides } });
      } catch (error) { issues.push(`${site.name} / ${version.name}: ${error instanceof Error ? error.message : 'Invalid quantities'}`); }
    }
  }
  return issues;
}
