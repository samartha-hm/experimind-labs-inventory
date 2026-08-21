import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from './ToastContext';

export interface CustomRoleDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  isSystemRole?: boolean;
  userCount?: number;
  permissions: {
    // Inventory & Catalog
    inventory_view: boolean;
    inventory_create: boolean;
    inventory_edit: boolean;
    inventory_delete: boolean;
    inventory_adjust_small: boolean;
    inventory_adjust_unlimited: boolean;
    
    // Physical Storage & Layout
    warehouse_view: boolean;
    warehouse_edit_floorplan: boolean;
    warehouse_manage_racks: boolean;
    
    // Procurement & POs
    po_view: boolean;
    po_create: boolean;
    po_approve_tier1: boolean; // Up to ₹100k
    po_approve_tier2: boolean; // Unlimited / High Value
    po_cancel: boolean;
    
    // Kit BOM & Engineering
    bom_view: boolean;
    bom_edit: boolean;
    bom_approve: boolean;
    
    // Finance & Compliance
    gst_generate_invoices: boolean;
    compliance_audit_view: boolean;
    manage_roles_and_users: boolean;
  };
}

export interface ApprovalRequest {
  id: string;
  type: 'purchase_order' | 'stock_adjustment' | 'bom_change';
  targetId: string;
  title: string;
  submittedBy: { id: string; name: string; role: string; email?: string };
  submittedAt: string;
  requiredTier: 'tier1_procurement' | 'tier2_finance_admin' | 'warehouse_supervisor' | 'engineering_lead';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  amount?: number;
  payload: any;
  diffs?: { field: string; oldValue: any; newValue: any }[];
  reviewedBy?: { id: string; name: string; role: string; timestamp: string; note: string };
  rejectionReason?: string;
}

export interface ApprovalThresholds {
  poTier1Threshold: number; // e.g. ₹25,000
  poTier2Threshold: number; // e.g. ₹1,00,000
  stockAdjustQtyThreshold: number; // e.g. 50 units
  stockAdjustValueThreshold: number; // e.g. ₹5,000
  requireBomApproval: boolean;
}

interface ApprovalContextType {
  requests: ApprovalRequest[];
  roles: CustomRoleDefinition[];
  thresholds: ApprovalThresholds;
  createApprovalRequest: (req: Omit<ApprovalRequest, 'id' | 'submittedAt' | 'status'>) => Promise<string>;
  approveRequest: (requestId: string, reviewerNote?: string) => Promise<void>;
  rejectRequest: (requestId: string, reason: string) => Promise<void>;
  addCustomRole: (role: Omit<CustomRoleDefinition, 'id'>) => Promise<string>;
  updateCustomRole: (roleId: string, updates: Partial<CustomRoleDefinition>) => Promise<void>;
  deleteCustomRole: (roleId: string) => Promise<void>;
  updateThresholds: (thresholds: Partial<ApprovalThresholds>) => void;
  pendingCount: number;
}

const DEFAULT_ROLES: CustomRoleDefinition[] = [
  {
    id: 'role_admin',
    name: 'Super Admin / Director',
    description: 'Unrestricted enterprise-wide governance, final financial & operational sign-off.',
    color: 'indigo',
    isSystemRole: true,
    userCount: 2,
    permissions: {
      inventory_view: true,
      inventory_create: true,
      inventory_edit: true,
      inventory_delete: true,
      inventory_adjust_small: true,
      inventory_adjust_unlimited: true,
      warehouse_view: true,
      warehouse_edit_floorplan: true,
      warehouse_manage_racks: true,
      po_view: true,
      po_create: true,
      po_approve_tier1: true,
      po_approve_tier2: true,
      po_cancel: true,
      bom_view: true,
      bom_edit: true,
      bom_approve: true,
      gst_generate_invoices: true,
      compliance_audit_view: true,
      manage_roles_and_users: true,
    },
  },
  {
    id: 'role_warehouse_lead',
    name: 'Warehouse Operations Lead',
    description: 'Manages physical racks, 2D floor plans, stock transfers, and routine adjustments.',
    color: 'amber',
    isSystemRole: false,
    userCount: 4,
    permissions: {
      inventory_view: true,
      inventory_create: true,
      inventory_edit: true,
      inventory_delete: false,
      inventory_adjust_small: true,
      inventory_adjust_unlimited: false,
      warehouse_view: true,
      warehouse_edit_floorplan: true,
      warehouse_manage_racks: true,
      po_view: true,
      po_create: true,
      po_approve_tier1: false,
      po_approve_tier2: false,
      po_cancel: false,
      bom_view: true,
      bom_edit: false,
      bom_approve: false,
      gst_generate_invoices: false,
      compliance_audit_view: true,
      manage_roles_and_users: false,
    },
  },
  {
    id: 'role_procurement',
    name: 'Procurement Specialist',
    description: 'Creates vendor POs, oversees lead times, signs off on Tier 1 purchases.',
    color: 'blue',
    isSystemRole: false,
    userCount: 3,
    permissions: {
      inventory_view: true,
      inventory_create: true,
      inventory_edit: true,
      inventory_delete: false,
      inventory_adjust_small: false,
      inventory_adjust_unlimited: false,
      warehouse_view: true,
      warehouse_edit_floorplan: false,
      warehouse_manage_racks: false,
      po_view: true,
      po_create: true,
      po_approve_tier1: true,
      po_approve_tier2: false,
      po_cancel: true,
      bom_view: true,
      bom_edit: false,
      bom_approve: false,
      gst_generate_invoices: false,
      compliance_audit_view: false,
      manage_roles_and_users: false,
    },
  },
  {
    id: 'role_rd_engineer',
    name: 'R&D Kit Design Engineer',
    description: 'Designs Composite Kit BOMs, manages component specifications and subassemblies.',
    color: 'emerald',
    isSystemRole: false,
    userCount: 5,
    permissions: {
      inventory_view: true,
      inventory_create: true,
      inventory_edit: true,
      inventory_delete: false,
      inventory_adjust_small: true,
      inventory_adjust_unlimited: false,
      warehouse_view: true,
      warehouse_edit_floorplan: false,
      warehouse_manage_racks: false,
      po_view: true,
      po_create: true,
      po_approve_tier1: false,
      po_approve_tier2: false,
      po_cancel: false,
      bom_view: true,
      bom_edit: true,
      bom_approve: true,
      gst_generate_invoices: false,
      compliance_audit_view: false,
      manage_roles_and_users: false,
    },
  },
];

const INITIAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'appr_01',
    type: 'purchase_order',
    targetId: 'PO-2026-0089',
    title: 'High-Value Optical Sensor Bulk Order from Mouser Electronics',
    submittedBy: { id: 'usr_02', name: 'Priya Sharma', role: 'Procurement Specialist', email: 'priya@experimindlabs.com' },
    submittedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    requiredTier: 'tier1_procurement',
    status: 'PENDING',
    amount: 68500,
    payload: { vendor: 'Mouser Electronics', poNumber: 'PO-2026-0089', itemCount: 12 },
    diffs: [
      { field: 'Total Purchase Amount', oldValue: '₹0 (New PO)', newValue: '₹68,500.00' },
      { field: 'Vendor Terms', oldValue: 'Standard', newValue: 'Net 30 Advance' },
    ],
  },
  {
    id: 'appr_02',
    type: 'stock_adjustment',
    targetId: 'item_esp32_wroom',
    title: 'ESD Damaged ESP32-WROOM Controller Batch Scrap Write-Off',
    submittedBy: { id: 'usr_03', name: 'Rahul Verma', role: 'Warehouse Operations Lead', email: 'rahul@experimindlabs.com' },
    submittedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    requiredTier: 'warehouse_supervisor',
    status: 'PENDING',
    amount: 14200,
    payload: { componentId: 'comp_esp32', qty: 60, reason: 'ESD Static Discharge during soldering test' },
    diffs: [
      { field: 'Stock Quantity', oldValue: '240 Units', newValue: '180 Units (-60 Scrapped)' },
      { field: 'Write-off Value', oldValue: '₹0', newValue: '₹14,200.00' },
    ],
  },
  {
    id: 'appr_03',
    type: 'bom_change',
    targetId: 'kit_iot_weather',
    title: 'IoT Weather Station Kit: Upgrade to BME680 Environmental Sensor',
    submittedBy: { id: 'usr_04', name: 'Ananya Roy', role: 'R&D Kit Design Engineer', email: 'ananya@experimindlabs.com' },
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    requiredTier: 'engineering_lead',
    status: 'APPROVED',
    payload: { kitId: 'kit_iot_weather', updatedReqsCount: 8 },
    diffs: [
      { field: 'Primary Sensor', oldValue: 'DHT22 Temperature/Humidity', newValue: 'BME680 Temp/Humidity/Pressure/Gas' },
      { field: 'Kit Estimated Unit Cost', oldValue: '₹1,450.00', newValue: '₹1,680.00 (+₹230)' },
    ],
    reviewedBy: {
      id: 'usr_01',
      name: 'Samartha HM (Lead Admin)',
      role: 'Super Admin / Director',
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
      note: 'Approved. Higher precision sensor is required for STEM curriculum validation.'
    }
  }
];

const ApprovalContext = createContext<ApprovalContextType | undefined>(undefined);

export const ApprovalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [roles, setRoles] = useState<CustomRoleDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('experimind_custom_roles_v2');
      return saved ? JSON.parse(saved) : DEFAULT_ROLES;
    } catch (_) {
      return DEFAULT_ROLES;
    }
  });

  const [requests, setRequests] = useState<ApprovalRequest[]>(() => {
    try {
      const saved = localStorage.getItem('experimind_approval_requests_v2');
      return saved ? JSON.parse(saved) : INITIAL_REQUESTS;
    } catch (_) {
      return INITIAL_REQUESTS;
    }
  });

  const [thresholds, setThresholds] = useState<ApprovalThresholds>(() => {
    try {
      const saved = localStorage.getItem('experimind_approval_thresholds_v1');
      return saved ? JSON.parse(saved) : {
        poTier1Threshold: 25000,
        poTier2Threshold: 100000,
        stockAdjustQtyThreshold: 50,
        stockAdjustValueThreshold: 5000,
        requireBomApproval: true
      };
    } catch (_) {
      return {
        poTier1Threshold: 25000,
        poTier2Threshold: 100000,
        stockAdjustQtyThreshold: 50,
        stockAdjustValueThreshold: 5000,
        requireBomApproval: true
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('experimind_custom_roles_v2', JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem('experimind_approval_requests_v2', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('experimind_approval_thresholds_v1', JSON.stringify(thresholds));
  }, [thresholds]);

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  const createApprovalRequest = async (req: Omit<ApprovalRequest, 'id' | 'submittedAt' | 'status'>): Promise<string> => {
    const newId = `appr_${Date.now()}`;
    const newReq: ApprovalRequest = {
      ...req,
      id: newId,
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
    };
    setRequests(prev => [newReq, ...prev]);
    showToast('info', 'Submitted for Approval', `Request "${req.title}" entered the approval queue.`);
    return newId;
  };

  const approveRequest = async (requestId: string, reviewerNote?: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'APPROVED' as const,
          reviewedBy: {
            id: 'usr_admin',
            name: 'Lead Admin Reviewer',
            role: 'Super Admin',
            timestamp: new Date().toISOString(),
            note: reviewerNote || 'Approved via Governance Console.'
          }
        };
      }
      return r;
    }));
    showToast('success', 'Request Approved', 'The action has been authorized and recorded in the audit trail.');
  };

  const rejectRequest = async (requestId: string, reason: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'REJECTED' as const,
          rejectionReason: reason,
          reviewedBy: {
            id: 'usr_admin',
            name: 'Lead Admin Reviewer',
            role: 'Super Admin',
            timestamp: new Date().toISOString(),
            note: reason
          }
        };
      }
      return r;
    }));
    showToast('error', 'Request Rejected', `Request was rejected: ${reason}`);
  };

  const addCustomRole = async (roleData: Omit<CustomRoleDefinition, 'id'>): Promise<string> => {
    const id = `role_${Date.now()}`;
    const newRole: CustomRoleDefinition = { ...roleData, id };
    setRoles(prev => [...prev, newRole]);
    showToast('success', 'Custom Role Created', `Created role "${newRole.name}" with configured permissions.`);
    return id;
  };

  const updateCustomRole = async (roleId: string, updates: Partial<CustomRoleDefinition>) => {
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, ...updates } : r));
    showToast('success', 'Role Updated', 'Permissions updated successfully.');
  };

  const deleteCustomRole = async (roleId: string) => {
    setRoles(prev => prev.filter(r => r.id !== roleId));
    showToast('info', 'Role Removed', 'Custom role has been deleted.');
  };

  const updateThresholds = (updates: Partial<ApprovalThresholds>) => {
    setThresholds(prev => ({ ...prev, ...updates }));
    showToast('success', 'Thresholds Updated', 'Approval workflow limits saved.');
  };

  return (
    <ApprovalContext.Provider
      value={{
        requests,
        roles,
        thresholds,
        createApprovalRequest,
        approveRequest,
        rejectRequest,
        addCustomRole,
        updateCustomRole,
        deleteCustomRole,
        updateThresholds,
        pendingCount,
      }}
    >
      {children}
    </ApprovalContext.Provider>
  );
};

export const useApproval = () => {
  const context = useContext(ApprovalContext);
  if (!context) {
    throw new Error('useApproval must be used within an ApprovalProvider');
  }
  return context;
};
