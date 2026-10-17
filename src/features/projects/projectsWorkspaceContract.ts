import type { ProductTemplateVersion } from '../../entity/ProductTemplateVersion';
import type { PlanningContent, PlanningPreview, PlanningView } from './planningTypes';
export function projectsWorkspaceEnabled(org: string, env: Record<string, string | undefined>): boolean {
  return ['development', 'test'].includes(env.NODE_ENV ?? '') && env.PROJECTS_WORKSPACE_READ_ONLY === 'true'
    && !!org && (env.PROJECTS_WORKSPACE_ORGANIZATIONS ?? '').split(',').map(v => v.trim()).includes(org);
}
export function projectsWorkspaceEditingEnabled(org: string, env: Record<string, string | undefined>): boolean {
  return projectsWorkspaceEnabled(org, env) && env.PROJECTS_WORKSPACE_EDITING === 'true';
}
export interface ProjectsWorkspaceDetail {
  canEdit?: boolean;
  project: PlanningView;
  preview: PlanningPreview;
  history: { revision: number; updated_by: string; created_at: string; archived: boolean; content: PlanningContent }[];
  versions: ProductTemplateVersion[];
  approvals: { version_id: string; source_version_id: string; source_revision: number; approved_by: string; approved_at: string }[];
}
/** Presentation only: quantities are persisted selections, never recalculated demand. */
export interface RequirementRow { site: string; selection: string; version: string; kit: string; subject: string; grade: string; quantity?: number; complete?: number }
export function requirementRows(content: PlanningContent, versions: ProductTemplateVersion[]): RequirementRow[] {
  return content.sites.flatMap(site => site.selections.flatMap(selection => {
    const version = versions.find(v => v.id === selection.version_id);
    if (!version) {
      const identity = { site: site.id, selection: selection.id, version: selection.version_id, kit: 'Version unavailable', subject: 'Unknown' };
      const saved = Object.entries(selection.context.grade_quantities).map(([id, quantity]) => ({ ...identity, grade: `Grade ${id} (label unavailable)`, quantity }));
      const bundles = Object.entries(selection.context.complete_sets ?? {}).map(([id, complete]) => ({ ...identity, grade: `Crate ${id} (label unavailable)`, complete }));
      return saved.length || bundles.length ? [...saved, ...bundles] : [{ ...identity, grade: 'Unknown', quantity: undefined, complete: undefined }];
    }
    return version.subjects.flatMap(subject => {
      const identity = { site: site.id, selection: selection.id, version: version.id, kit: `${version.name} v${version.version_number}`, subject: subject.name };
      return [
        ...subject.grades.map(grade => ({ ...identity, grade: grade.name, quantity: selection.context.grade_quantities[grade.id] })),
        ...(subject.crates ?? []).filter(crate => crate.rule.kind === 'complete_sets').map(crate => ({ ...identity, grade: `${crate.name} (explicit bundle)`, complete: selection.context.complete_sets?.[crate.id] })),
      ];
    });
  }));
}
