export type PlatformRole = 'admin' | 'inventory_staff' | 'project_staff';

type LegacyRole = string | null | undefined;

const roleAliases: Record<string, PlatformRole> = {
  admin: 'admin',
  manager: 'admin',
  staff: 'inventory_staff',
  inventory_staff: 'inventory_staff',
  viewer: 'project_staff',
  project_staff: 'project_staff',
};

const sharedTabs = new Set(['overview', 'inventory', 'projects_hub', 'sales_orders']);

const roleTabs: Record<PlatformRole, Set<string>> = {
  admin: new Set([
    ...sharedTabs,
    'purchase_orders',
    'production_command',
    'sticker_hub',
    'kitting',
    'warehouses',
    'stock_transfer',
    'cycle_counts',
    'vendors',
    'user_directory',
    'analytics',
    'shop',
  ]),
  inventory_staff: new Set([
    ...sharedTabs,
    'purchase_orders',
    'warehouses',
    'stock_transfer',
    'cycle_counts',
    'vendors',
    'kitting',
  ]),
  project_staff: new Set([
    ...sharedTabs,
    'production_command',
    'sticker_hub',
    'kitting',
  ]),
};

export function normalizePlatformRole(role: LegacyRole): PlatformRole {
  return roleAliases[role ?? ''] ?? 'inventory_staff';
}

export function canAccessTab(role: LegacyRole, tab: string): boolean {
  return roleTabs[normalizePlatformRole(role)].has(tab);
}

export function getDefaultWorkspaceTab(role: LegacyRole): string {
  const normalizedRole = normalizePlatformRole(role);
  return normalizedRole === 'project_staff' ? 'projects_hub' : 'overview';
}

export function getVisibleWorkspaceTabs(role: LegacyRole): string[] {
  return Array.from(roleTabs[normalizePlatformRole(role)]);
}
