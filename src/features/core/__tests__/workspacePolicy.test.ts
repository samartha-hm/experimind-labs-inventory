import { describe, expect, it } from 'vitest';
import {
  canAccessTab,
  getDefaultWorkspaceTab,
  getVisibleWorkspaceTabs,
  normalizePlatformRole,
} from '../workspacePolicy';

describe('workspace policy', () => {
  it('maps existing roles to the focused platform roles', () => {
    expect(normalizePlatformRole('manager')).toBe('admin');
    expect(normalizePlatformRole('staff')).toBe('inventory_staff');
    expect(normalizePlatformRole('viewer')).toBe('project_staff');
  });

  it('gives inventory staff operational access without specialist tools', () => {
    expect(canAccessTab('inventory_staff', 'inventory')).toBe(true);
    expect(canAccessTab('inventory_staff', 'purchase_orders')).toBe(true);
    expect(canAccessTab('inventory_staff', 'hardware_workbench')).toBe(false);
    expect(canAccessTab('inventory_staff', 'qms_suite')).toBe(false);
  });

  it('gives project staff the project preparation workspace', () => {
    expect(getDefaultWorkspaceTab('project_staff')).toBe('projects_hub');
    expect(canAccessTab('project_staff', 'production_command')).toBe(true);
    expect(canAccessTab('project_staff', 'purchase_orders')).toBe(false);
  });

  it('keeps the visible surface within the operational product boundary', () => {
    const visibleTabs = getVisibleWorkspaceTabs('admin');
    expect(visibleTabs).toContain('replenishment');
    expect(visibleTabs).not.toContain('copilot');
    expect(visibleTabs).not.toContain('hardware_workbench');
    expect(visibleTabs).not.toContain('automations');
  });
});
