import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Lock,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sliders,
  FileText
} from 'lucide-react';
import { useApproval, CustomRoleDefinition } from '@/src/contexts/ApprovalContext';
import { useToast } from '@/src/contexts/ToastContext';

interface CustomRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERMISSION_SECTIONS = [
  {
    title: '📦 Inventory Catalog & Parts',
    keys: [
      { key: 'inventory_view', label: 'View Inventory Catalog', desc: 'Browse SKUs, stock levels, and part details' },
      { key: 'inventory_create', label: 'Create New Inventory Parts', desc: 'Register new electronic components and chemicals' },
      { key: 'inventory_edit', label: 'Edit Part Properties & Pricing', desc: 'Update costs, thresholds, and supplier details' },
      { key: 'inventory_delete', label: 'Delete Inventory Parts', desc: 'Permanently remove parts from the database' },
      { key: 'inventory_adjust_small', label: 'Routine Stock Adjustments (≤ 50 qty)', desc: 'Routine cycle counts and minor scrap' },
      { key: 'inventory_adjust_unlimited', label: 'High-Value Stock Write-Off (> 50 qty)', desc: 'Unlimited stock write-offs without approval' },
    ]
  },
  {
    title: '🏗️ Warehouse Spatial & Physical Topology',
    keys: [
      { key: 'warehouse_view', label: 'View Facilities & Racks', desc: 'View physical storage units and bin contents' },
      { key: 'warehouse_edit_floorplan', label: 'Design 2D Floor Plan Blueprints', desc: 'Move racks, edit spatial layout, add packing tables' },
      { key: 'warehouse_manage_racks', label: 'Add/Edit Storage Racks & Tiers', desc: 'Create steel shelves, plywood grids, and safety cabinets' },
    ]
  },
  {
    title: '🛒 Procurement & Purchase Orders',
    keys: [
      { key: 'po_view', label: 'View Purchase Orders', desc: 'View incoming supplier orders and ETA dates' },
      { key: 'po_create', label: 'Draft Purchase Orders', desc: 'Create new vendor purchase orders' },
      { key: 'po_approve_tier1', label: 'Approve Tier 1 POs (Up to ₹1,00,000)', desc: 'Authorize procurement orders up to ₹1 Lakh' },
      { key: 'po_approve_tier2', label: 'Approve Tier 2 High-Value POs (> ₹1,00,000)', desc: 'Authorize large capital and bulk component POs' },
      { key: 'po_cancel', label: 'Cancel Purchase Orders', desc: 'Void or cancel active vendor purchase orders' },
    ]
  },
  {
    title: '🔬 Composite Kits & BOM Engineering',
    keys: [
      { key: 'bom_view', label: 'View Kit BOM Recipes', desc: 'Access STEM kit formulation breakdowns' },
      { key: 'bom_edit', label: 'Edit & Customize Kit BOMs', desc: 'Modify component ratios and assembly requirements' },
      { key: 'bom_approve', label: 'Approve Engineering BOM Changes', desc: 'Authorize engineering change orders (ECO)' },
    ]
  },
  {
    title: '💰 Finance, GST & Governance',
    keys: [
      { key: 'gst_generate_invoices', label: 'Generate GST Invoices & E-Way Bills', desc: 'Sign GSTR-1 invoices and access tax portal' },
      { key: 'compliance_audit_view', label: 'View SHA-256 Audit Trails', desc: 'Inspect immutable ledger and valuation logs' },
      { key: 'manage_roles_and_users', label: 'Manage Roles & User Access', desc: 'Create enterprise roles and grant permissions' },
    ]
  }
];

export default function CustomRolesModal({ isOpen, onClose }: CustomRolesModalProps) {
  const { roles, addCustomRole, updateCustomRole, deleteCustomRole } = useApproval();
  const { showToast } = useToast();

  const [selectedRole, setSelectedRole] = useState<CustomRoleDefinition | null>(roles[0] || null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New Role Form State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('indigo');
  const [newRolePerms, setNewRolePerms] = useState<Record<string, boolean>>({
    inventory_view: true,
    warehouse_view: true,
    po_view: true,
    bom_view: true,
    compliance_audit_view: false,
    inventory_create: false,
    inventory_edit: false,
    inventory_delete: false,
    inventory_adjust_small: true,
    inventory_adjust_unlimited: false,
    warehouse_edit_floorplan: false,
    warehouse_manage_racks: false,
    po_create: true,
    po_approve_tier1: false,
    po_approve_tier2: false,
    po_cancel: false,
    bom_edit: false,
    bom_approve: false,
    gst_generate_invoices: false,
    manage_roles_and_users: false,
  });

  if (!isOpen) return null;

  const handleTogglePermission = (key: string) => {
    if (isCreatingNew) {
      setNewRolePerms(prev => ({ ...prev, [key]: !prev[key] }));
    } else if (selectedRole && !selectedRole.isSystemRole) {
      const updated = {
        ...selectedRole.permissions,
        [key]: !(selectedRole.permissions as any)[key]
      };
      updateCustomRole(selectedRole.id, { permissions: updated });
      setSelectedRole(prev => prev ? { ...prev, permissions: updated } : null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const id = await addCustomRole({
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Custom Organization Role',
      color: newRoleColor,
      isSystemRole: false,
      userCount: 1,
      permissions: newRolePerms as any,
    });

    setIsCreatingNew(false);
    setNewRoleName('');
    setNewRoleDesc('');
    const created = roles.find(r => r.id === id);
    if (created) setSelectedRole(created);
  };

  const handleDeleteCurrentRole = async () => {
    if (!selectedRole || selectedRole.isSystemRole) return;
    if (confirm(`Are you sure you want to delete custom role "${selectedRole.name}"?`)) {
      await deleteCustomRole(selectedRole.id);
      setSelectedRole(roles[0] || null);
    }
  };

  const currentPermissions = isCreatingNew
    ? newRolePerms
    : (selectedRole?.permissions || {}) as Record<string, boolean>;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Custom Roles & Granular Permission Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Configure role-based access control (RBAC), approval thresholds, and operational privileges.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body (2 Columns) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Roles List Sidebar */}
          <div className="w-full md:w-80 border-r border-slate-100 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto shrink-0 custom-scrollbar">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Enterprise Roles ({roles.length})
              </span>
              <button
                onClick={() => {
                  setIsCreatingNew(true);
                  setSelectedRole(null);
                }}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition-all"
              >
                <Plus className="w-3 h-3" /> New Role
              </button>
            </div>

            <div className="space-y-2">
              {roles.map((r) => {
                const isSelected = !isCreatingNew && selectedRole?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setIsCreatingNew(false);
                      setSelectedRole(r);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {r.name}
                      </span>
                      {r.isSystemRole && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-[8px] font-bold">
                          SYSTEM
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {r.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[9px] font-mono text-slate-400">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{r.userCount || 1} Assigned User(s)</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Permission Matrix or New Role Form */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-white dark:bg-slate-900">
            
            {/* Header info of selected role */}
            {isCreatingNew ? (
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="font-black text-sm text-indigo-900 dark:text-indigo-200">
                    Create New Organization Role
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Role Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Quality Assurance Inspector"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="Primary duties and operational domain..."
                      value={newRoleDesc}
                      onChange={(e) => setNewRoleDesc(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : selectedRole ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base text-slate-900 dark:text-white">{selectedRole.name}</h4>
                    {selectedRole.isSystemRole && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[9px] font-bold">
                        Protected System Role
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedRole.description}</p>
                </div>

                {!selectedRole.isSystemRole && (
                  <button
                    onClick={handleDeleteCurrentRole}
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Role
                  </button>
                )}
              </div>
            ) : null}

            {/* Permission Checkboxes Matrix */}
            <div className="space-y-6">
              {PERMISSION_SECTIONS.map((section, sIdx) => (
                <div key={sIdx} className="space-y-3">
                  <h5 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    {section.title}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {section.keys.map(({ key, label, desc }) => {
                      const isGranted = !!currentPermissions[key];
                      const isReadOnly = !isCreatingNew && (selectedRole?.isSystemRole || false);

                      return (
                        <div
                          key={key}
                          onClick={() => {
                            if (!isReadOnly) handleTogglePermission(key);
                          }}
                          className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 text-xs select-none ${
                            isGranted
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800/80 text-slate-900 dark:text-white'
                              : 'bg-slate-50/40 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-400'
                          } ${!isReadOnly ? 'cursor-pointer hover:border-indigo-400' : 'cursor-default'}`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs block">{label}</span>
                            <span className="text-[10px] text-slate-400 block font-normal">{desc}</span>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                              isGranted
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {isGranted && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Form Actions (If creating) */}
            {isCreatingNew && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setSelectedRole(roles[0] || null);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSubmit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Save Custom Role
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
