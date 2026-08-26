import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Check, 
  X, 
  Lock, 
  Users, 
  Key, 
  FileText, 
  Trash2, 
  Edit3, 
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  UserCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import { useAuth } from '../../../AuthContext';

interface RoleData {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_system: boolean;
  color: string;
  permissions: string[];
}

const PERMISSION_GROUPS = [
  {
    category: 'Inventory Management',
    icon: '📦',
    permissions: [
      { key: 'inventory:read', label: 'View Inventory & Catalog', desc: 'Browse SKUs, categories, and stock quantities' },
      { key: 'inventory:write', label: 'Create & Edit Items', desc: 'Add new products and modify SKU specifications' },
      { key: 'inventory:adjust', label: 'Post Stock Adjustments', desc: 'Directly modify on-hand stock balances in ledger' },
      { key: 'inventory:delete', label: 'Delete Catalog Items', desc: 'Permanently archive or remove items' },
    ]
  },
  {
    category: 'Warehouse & WMS Floor',
    icon: '🏭',
    permissions: [
      { key: 'warehouse:read', label: 'View Facilities & 3D Twin', desc: 'Inspect rack layouts, floor plans, and bin map' },
      { key: 'warehouse:write', label: 'Configure Layout & Bins', desc: 'Add new bays, shelves, and storage zones' },
      { key: 'warehouse:transfer', label: 'Initiate & Receive STOs', desc: 'Create and slot multi-stage stock transfers' },
      { key: 'warehouse:audit', label: 'Conduct Cycle Counts', desc: 'Run physical count audits and reconcile variances' },
    ]
  },
  {
    category: 'Procurement & Inbound Dock',
    icon: '📥',
    permissions: [
      { key: 'procurement:read', label: 'View Vendors & POs', desc: 'Browse supplier directories and purchase orders' },
      { key: 'procurement:write', label: 'Create Purchase Orders', desc: 'Issue new procurement requests to suppliers' },
      { key: 'procurement:receive', label: 'Inbound Dock Receiving', desc: 'Scan deliveries and print thermal putaway labels' },
    ]
  },
  {
    category: 'Sales & Outbound Dispatch',
    icon: '🚚',
    permissions: [
      { key: 'sales:read', label: 'View Sales Orders & Customers', desc: 'Inspect customer order queues and status' },
      { key: 'sales:write', label: 'Create & Edit Sales Orders', desc: 'Enter sales orders and customer invoices' },
      { key: 'sales:dispatch', label: 'Pick, Pack & Ship', desc: 'Fulfill orders with barcode scanning and courier AWB' },
    ]
  },
  {
    category: 'Financials & Valuation',
    icon: '💰',
    permissions: [
      { key: 'finance:gst', label: 'GST Engine & E-Invoicing', desc: 'Generate HSN tax breakdowns and IRN invoices' },
      { key: 'finance:valuation', label: 'Stock Valuation & Analytics', desc: 'View FIFO cost layers and financial reports' },
      { key: 'finance:zoho', label: 'Zoho Books Integration', desc: 'Trigger 2-way sync with cloud accounting' },
    ]
  },
  {
    category: 'Governance & Security',
    icon: '🛡️',
    permissions: [
      { key: 'compliance:audit_logs', label: 'Audit Trail Viewer', desc: 'View immutable system logs and actor stamps' },
      { key: 'compliance:roles', label: 'Manage RBAC Matrix', desc: 'Create custom roles and modify permissions' },
      { key: 'compliance:users', label: 'User Directory Admin', desc: 'Invite users, reset passwords, and assign roles' },
      { key: 'compliance:approvals', label: 'Approve High-Value POs', desc: 'Sign off on multi-tier financial thresholds' },
    ]
  }
];

export const RolePermissionMatrixTab: React.FC = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    code: '',
    description: '',
    color: 'indigo'
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/v1/rbac/roles');
      if (Array.isArray(data)) {
        setRoles(data);
        if (!selectedRole && data.length > 0) {
          setSelectedRole(data[0]);
        } else if (selectedRole) {
          const updated = data.find(r => r.id === selectedRole.id);
          if (updated) setSelectedRole(updated);
        }
      }
    } catch (e: any) {
      console.error('Failed to load roles', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleTogglePermission = async (permKey: string) => {
    if (!selectedRole) return;
    const currentPerms = selectedRole.permissions || [];
    const hasPerm = currentPerms.includes(permKey);
    const newPerms = hasPerm 
      ? currentPerms.filter(p => p !== permKey) 
      : [...currentPerms, permKey];

    const updatedRole = { ...selectedRole, permissions: newPerms };
    setSelectedRole(updatedRole);

    try {
      setSaving(true);
      await apiFetch(`/api/v1/rbac/roles/${selectedRole.id}`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: newPerms })
      });
      setRoles(prev => prev.map(r => r.id === selectedRole.id ? updatedRole : r));
      setToastMsg(`Permissions updated for ${selectedRole.name}`);
      setTimeout(() => setToastMsg(null), 2500);
    } catch (e: any) {
      alert(`Failed to save permission: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name || !newRole.code) return;

    try {
      setSaving(true);
      const created = await apiFetch('/api/v1/rbac/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: newRole.name,
          code: newRole.code.toLowerCase().replace(/\s+/g, '_'),
          description: newRole.description,
          color: newRole.color,
          permissions: []
        })
      });
      setShowCreateModal(false);
      setNewRole({ name: '', code: '', description: '', color: 'indigo' });
      await fetchRoles();
      setSelectedRole(created);
      setToastMsg(`Custom role "${created.name}" created successfully.`);
      setTimeout(() => setToastMsg(null), 2500);
    } catch (e: any) {
      alert(`Error creating role: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete custom role "${roleName}"?`)) return;
    try {
      await apiFetch(`/api/v1/rbac/roles/${roleId}`, { method: 'DELETE' });
      await fetchRoles();
      if (selectedRole?.id === roleId) {
        setSelectedRole(roles.find(r => r.id !== roleId) || null);
      }
      setToastMsg(`Role "${roleName}" deleted.`);
      setTimeout(() => setToastMsg(null), 2500);
    } catch (e: any) {
      alert(`Delete Error: ${e.message}`);
    }
  };

  const getColorBadge = (color: string) => {
    switch (color) {
      case 'indigo': return 'bg-indigo-900/40 text-indigo-400 border-indigo-700/50';
      case 'emerald': return 'bg-emerald-900/40 text-emerald-400 border-emerald-700/50';
      case 'blue': return 'bg-blue-900/40 text-blue-400 border-blue-700/50';
      case 'amber': return 'bg-amber-900/40 text-amber-400 border-amber-700/50';
      case 'purple': return 'bg-purple-900/40 text-purple-400 border-purple-700/50';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-2xl animate-fade-in font-medium">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl backdrop-blur-xl shadow-xs">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20 dark:border-indigo-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">Enterprise Role & Permission Matrix</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Define granular module-level capabilities, assign system authorities, and safeguard compliance across operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRoles()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-sm transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Custom Role
          </button>
        </div>
      </div>

      {/* Main Grid: Left Roles Panel + Right Permission Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Roles List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
            <span>Configured Roles ({roles.length})</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Select to inspect</span>
          </div>

          <div className="space-y-2">
            {roles.map(role => {
              const isSelected = selectedRole?.id === role.id;
              const permCount = (role.permissions || []).length;
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-50/80 dark:bg-slate-800/90 border-indigo-500 shadow-md ring-2 ring-indigo-500/20' 
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getColorBadge(role.color)}`}>
                        {role.name}
                      </span>
                      {role.is_system && (
                        <span className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          <Lock className="w-3 h-3 text-slate-500" /> System
                        </span>
                      )}
                    </div>

                    {!role.is_system && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id, role.name);
                        }}
                        className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete custom role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {role.description || 'Custom organizational permission profile.'}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>Code: {role.code}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{permCount} Capabilities</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Permission Matrix Table */}
        <div className="lg:col-span-8 bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xs">
          {selectedRole ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedRole.name} Matrix</h3>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getColorBadge(selectedRole.color)}`}>
                      {selectedRole.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Toggle individual capabilities on or off. Changes persist immediately to active sessions.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total Active:</span>
                  <span className="ml-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {(selectedRole.permissions || []).length} Granted
                  </span>
                </div>
              </div>

              {/* Permission Groups Accordion */}
              <div className="space-y-6">
                {PERMISSION_GROUPS.map((group, gIdx) => {
                  const groupPermKeys = group.permissions.map(p => p.key);
                  const activeCount = groupPermKeys.filter(k => (selectedRole.permissions || []).includes(k)).length;
                  const allActive = activeCount === groupPermKeys.length;

                  return (
                    <div key={gIdx} className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{group.icon}</span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">{group.category}</h4>
                        </div>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                          {activeCount} / {group.permissions.length} Enabled
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {group.permissions.map(perm => {
                          const isEnabled = (selectedRole.permissions || []).includes(perm.key);
                          return (
                            <div
                              key={perm.key}
                              onClick={() => handleTogglePermission(perm.key)}
                              className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all select-none ${
                                isEnabled
                                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60'
                                  : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-850'
                              }`}
                            >
                              <div>
                                <p className={`text-xs font-semibold ${isEnabled ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-300'}`}>
                                  {perm.label}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                  {perm.desc}
                                </p>
                              </div>

                              <div className="mt-0.5">
                                {isEnabled ? (
                                  <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400">
              <Shield className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium">Select a role from the left panel to configure its permission matrix.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Custom Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                Create Custom Role
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance Inspector"
                  value={newRole.name}
                  onChange={(e) => {
                    setNewRole(prev => ({
                      ...prev,
                      name: e.target.value,
                      code: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">System Code (Unique ID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. qa_inspector"
                  value={newRole.code}
                  onChange={(e) => setNewRole(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-indigo-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Color Badge</label>
                <div className="flex gap-3">
                  {['indigo', 'emerald', 'blue', 'amber', 'purple'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewRole(prev => ({ ...prev, color }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all ${getColorBadge(color)} ${
                        newRole.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-60'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Role Description</label>
                <textarea
                  rows={3}
                  placeholder="Summarize the core duties and responsibilities assigned to this role..."
                  value={newRole.description}
                  onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30"
                >
                  {saving ? 'Creating...' : 'Save Role Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
