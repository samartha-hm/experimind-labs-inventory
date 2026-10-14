export interface InstallationTask { id: string; label: string; required: boolean; checked: boolean; checked_by?: string; checked_at?: string }
export interface InstallationIssue { id: string; notes: string; reported_by: string; reported_at: string; correction?: string; corrected_by?: string; corrected_at?: string }
export interface Acceptance { recipient: string; notes: string; accepted_by: string; accepted_at: string }
export interface InstallationJob {
  id: string; organization_id: string; project_id: string; site_id: string; revision: number;
  status: "pending" | "in_progress" | "blocked" | "installed" | "completed";
  required: boolean; employee_id: string | null; checklist: InstallationTask[]; notes: string; survey: string;
  issues: InstallationIssue[]; acceptance: Acceptance | null; created_by: string; updated_by: string;
}
export interface ProjectCompletion {
  id: string; project_id: string; organization_id: string; revision: number; project_revision: number;
  status: "active" | "closed"; acceptance: Acceptance | null;
  exception: { reason: string; blockers: string[]; approved_by: string; approved_at: string } | null;
  reason: string; updated_by: string;
}
export interface SchoolCompletion {
  site_id: string; name: string; packages: number; delivered: number; remaining: number;
  delivery_status: string; issues: number; installation: InstallationJob | null;
}
export interface CompletionProgress {
  project_id: string; project_revision: number; schools: SchoolCompletion[]; blockers: string[];
  completion: ProjectCompletion | null; history: { kind: string; revision: number; snapshot: unknown }[];
}
