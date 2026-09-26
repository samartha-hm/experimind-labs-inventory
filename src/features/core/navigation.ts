import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  PackageCheck,
  FolderKanban,
  Settings2,
  Activity,
  Box,
  Package,
  Warehouse,
  ArrowRightLeft,
  ClipboardCheck,
  ShoppingCart,
  Users,
  Factory,
  QrCode,
  TrendingUp,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { canAccessTab } from './workspacePolicy';

export interface WorkspaceNavItem {
  tabId: string;
  label: string;
  icon: LucideIcon;
}

export interface WorkspaceGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: WorkspaceNavItem[];
}

export const workspaceGroups: WorkspaceGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [{ tabId: 'overview', label: 'Operations overview', icon: Activity }],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    items: [
      { tabId: 'inventory', label: 'Items & stock', icon: Box },
      { tabId: 'kitting', label: 'Kit assembly', icon: Package },
      { tabId: 'warehouses', label: 'Warehouses & bins', icon: Warehouse },
      { tabId: 'stock_transfer', label: 'Stock transfers', icon: ArrowRightLeft },
      { tabId: 'cycle_counts', label: 'Cycle counts', icon: ClipboardCheck },
    ],
  },
  {
    id: 'replenishment',
    label: 'Replenishment',
    icon: ClipboardList,
    items: [
      { tabId: 'purchase_orders', label: 'Purchase orders', icon: ShoppingCart },
      { tabId: 'vendors', label: 'Suppliers', icon: Users },
    ],
  },
  {
    id: 'fulfillment',
    label: 'Fulfillment',
    icon: PackageCheck,
    items: [{ tabId: 'sales_orders', label: 'Sales orders', icon: PackageCheck }],
  },
  {
    id: 'projects',
    label: 'Projects & Prastuti',
    icon: FolderKanban,
    items: [
      { tabId: 'projects_hub', label: 'Projects', icon: FolderKanban },
      { tabId: 'production_command', label: 'Preparation queue', icon: Factory },
      { tabId: 'sticker_hub', label: 'Labels & verification', icon: QrCode },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Settings2,
    items: [
      { tabId: 'analytics', label: 'Reports', icon: TrendingUp },
      { tabId: 'user_directory', label: 'People & roles', icon: Users },
      { tabId: 'shop', label: 'Storefront', icon: ShoppingBag },
    ],
  },
];

export function getGroupForTab(tabId: string): WorkspaceGroup | undefined {
  return workspaceGroups.find((group) => group.items.some((item) => item.tabId === tabId));
}

export function getGroupDefaultTab(group: WorkspaceGroup): string {
  return group.items[0].tabId;
}

export function getVisibleGroups(role: string | null): WorkspaceGroup[] {
  return workspaceGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessTab(role, item.tabId)),
    }))
    .filter((group) => group.items.length > 0);
}
