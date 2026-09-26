import { describe, expect, it } from 'vitest';
import {
  getGroupDefaultTab,
  getGroupForTab,
  getVisibleGroups,
  workspaceGroups,
} from '../navigation';
import { canAccessTab } from '../workspacePolicy';

const routedTabs = [
  'overview',
  'inventory',
  'kitting',
  'warehouses',
  'stock_transfer',
  'cycle_counts',
  'purchase_orders',
  'vendors',
  'sales_orders',
  'projects_hub',
  'production_command',
  'sticker_hub',
  'analytics',
  'user_directory',
  'shop',
];

describe('workspace navigation groups', () => {
  it('covers every routed operational tab exactly once', () => {
    const grouped = workspaceGroups.flatMap((group) => group.items.map((item) => item.tabId));
    const counts = new Map<string, number>();
    grouped.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));

    for (const tab of routedTabs) {
      expect(counts.get(tab)).toBe(1);
    }
    for (const [tabId] of counts) {
      expect(routedTabs).toContain(tabId);
    }
  });

  it('resolves the owning group for each tab and a valid default per group', () => {
    expect(getGroupForTab('cycle_counts')?.id).toBe('inventory');
    expect(getGroupForTab('sticker_hub')?.id).toBe('projects');
    expect(getGroupForTab('analytics')?.id).toBe('admin');
    expect(getGroupForTab('purchase_orders')?.id).toBe('replenishment');

    for (const group of workspaceGroups) {
      const defaults = getGroupDefaultTab(group);
      expect(group.items.map((item) => item.tabId)).toContain(defaults);
    }
  });

  it('filters items by role and hides groups the role cannot use', () => {
    const projectStaffGroups = getVisibleGroups('project_staff');
    const ids = projectStaffGroups.map((group) => group.id);
    expect(ids).toContain('overview');
    expect(ids).toContain('inventory');
    expect(ids).toContain('fulfillment');
    expect(ids).toContain('projects');
    expect(ids).not.toContain('replenishment');
    expect(ids).not.toContain('admin');

    const inventoryGroup = projectStaffGroups.find((group) => group.id === 'inventory');
    expect(inventoryGroup?.items.map((item) => item.tabId)).toEqual(['inventory', 'kitting']);

    for (const group of projectStaffGroups) {
      for (const item of group.items) {
        expect(canAccessTab('project_staff', item.tabId)).toBe(true);
      }
    }
  });

  it('keeps the admin surface complete and ordered', () => {
    const adminGroups = getVisibleGroups('admin');
    expect(adminGroups.map((group) => group.id)).toEqual([
      'overview',
      'inventory',
      'replenishment',
      'fulfillment',
      'projects',
      'admin',
    ]);
    const replenishment = adminGroups.find((group) => group.id === 'replenishment');
    expect(replenishment?.items.map((item) => item.tabId)).toEqual(['purchase_orders', 'vendors']);
  });

  it('gives inventory staff operations without the admin workspace', () => {
    const groups = getVisibleGroups('inventory_staff');
    expect(groups.map((group) => group.id)).toEqual([
      'overview',
      'inventory',
      'replenishment',
      'fulfillment',
      'projects',
    ]);
    const projects = groups.find((group) => group.id === 'projects');
    expect(projects?.items.map((item) => item.tabId)).toEqual(['projects_hub']);
  });
});
