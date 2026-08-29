import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  Key, 
  Mail, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Laptop,
  Lock,
  User,
  Info,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  Save,
  Shield
} from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import { useAuth } from '../../../AuthContext';
import { ActiveSessionsModal } from './ActiveSessionsModal';

interface UserRecord {
  id: string;
  email: string;
  name?: string;
  role: string;
  is_active?: boolean;
  status?: string;
  created_at: string;
  last_login?: string;
}

export const STANDARD_ROLES = [
  {
    code: 'admin',
    name: 'Administrator',
    description: 'Full governance, user provisioning, system configuration, compliance & financial exports.',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    icon: '👑',
  },
  {
    code: 'editor',
    name: 'Inventory Manager',
    description: 'Stock operations, composite kits (BOM), supplier POs, goods receipt notes & approvals.',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    icon: '📦',
  },
  {
    code: 'employee',
    name: 'Lab Staff / Educator',
    description: 'Barcode scanning, stock in/out logging, school workshop kits, and kit usage tracking.',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: '🔬',
  },
  {
    code: 'viewer',
    name: 'Auditor / Observer',
    description: 'Read-only visibility into financial valuations, audit logs, and inventory reports.',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    icon: '👁️',
  },
];

export const UserDirectoryTab: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);

  // Forms
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });

  const [editForm, setEditForm] = useState({
    name: '',
    role: 'employee',
    password: '',
    is_active: true
  });

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const uData = await apiFetch('/api/v1/users');
      if (Array.isArray(uData)) setUsers(uData);
    } catch (e: any) {
      console.error('Failed to load user directory', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) return;

    try {
      setSaving(true);
      await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      setShowInviteModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'employee' });
      await fetchUsers();
      setToastMsg(`User ${newUser.email} created and role assigned successfully.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e: any) {
      alert(`Error provisioning user: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, newRoleCode: string) => {
    try {
      await apiFetch(`/api/v1/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRoleCode })
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRoleCode } : u));
      setToastMsg('User role updated successfully.');
      setTimeout(() => setToastMsg(null), 2500);
    } catch (e: any) {
      alert(`Role assignment error: ${e.message}`);
    }
  };

  const handleOpenEdit = (user: UserRecord) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      role: (user.role === 'staff' ? 'employee' : user.role === 'manager' ? 'editor' : user.role) || 'employee',
      password: '',
      is_active: user.is_active !== false
    });
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSaving(true);
      const payload: any = {
        name: editForm.name.trim(),
        role: editForm.role,
        is_active: editForm.is_active
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      await apiFetch(`/api/v1/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      setEditingUser(null);
      await fetchUsers();
      setToastMsg(`User ${editingUser.email} updated successfully.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e: any) {
      alert(`Error updating user: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    if (currentUser?.id === deletingUser.id || currentUser?.email === deletingUser.email) {
      alert("You cannot delete your own active account.");
      return;
    }
    if (deletingUser.email === 'admin@experimindlabs.com') {
      alert("The master administrator account cannot be deleted.");
      return;
    }

    try {
      setSaving(true);
      await apiFetch(`/api/v1/users/${deletingUser.id}`, {
        method: 'DELETE'
      });
      const deletedEmail = deletingUser.email;
      setDeletingUser(null);
      await fetchUsers();
      setToastMsg(`User ${deletedEmail} removed from organization.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e: any) {
      alert(`Error deleting user: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleInfo = (roleCode: string) => {
    const normalized = roleCode === 'staff' ? 'employee' : roleCode === 'manager' ? 'editor' : roleCode;
    return STANDARD_ROLES.find(r => r.code === normalized) || {
      code: roleCode,
      name: roleCode,
      description: 'Standard system user',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      icon: '👤'
    };
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-2xl animate-fadeIn font-medium text-xs">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Team & Enterprise Role Access</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Standard Role-Based Access Control (RBAC), multi-tenant provisioning, and active session auditing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSessionsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Active Sessions</span>
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-extrabold text-xs transition-all shadow-md shadow-indigo-600/25 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Role Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STANDARD_ROLES.map((roleDef) => (
          <div
            key={roleDef.code}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">{roleDef.icon}</span>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${roleDef.badgeBg}`}>
                {users.filter(u => (u.role === 'staff' ? 'employee' : u.role === 'manager' ? 'editor' : u.role) === roleDef.code).length} Members
              </span>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">{roleDef.name}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{roleDef.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Active Users in Organization:</span>
          <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {filteredUsers.length}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Team Member</th>
                <th className="py-3.5 px-4">Role Badge</th>
                <th className="py-3.5 px-4">Access Level</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading directory records...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <span>No members match your search query.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  const isCurrent = currentUser?.id === user.id || currentUser?.email === user.email;
                  const isActive = user.is_active !== false;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-black text-white text-xs shadow-xs">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{user.name || 'Unnamed Member'}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border ${roleInfo.badgeBg}`}>
                          <span>{roleInfo.icon}</span>
                          <span>{roleInfo.name}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <select
                          value={user.role === 'staff' ? 'employee' : user.role === 'manager' ? 'editor' : user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={isCurrent}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="admin">Administrator (Full Control)</option>
                          <option value="editor">Inventory Manager</option>
                          <option value="employee">Lab Staff / Educator</option>
                          <option value="viewer">Auditor (Read-Only)</option>
                        </select>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-500 font-mono">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Direct Access'}
                      </td>

                      <td className="py-4 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Actions Column with Edit & Delete */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Edit User Profile & Credentials"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isCurrent && user.email !== 'admin@experimindlabs.com' && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Delete / Revoke Member Access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fadeIn space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Team Member</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{editingUser.email}</p>
                </div>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Role & Access Level</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                  disabled={currentUser?.id === editingUser.id}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-100 font-semibold disabled:opacity-50"
                >
                  <option value="admin">Administrator — Full control, settings & compliance</option>
                  <option value="editor">Inventory Manager — Stock in/out, kits & POs</option>
                  <option value="employee">Lab Staff / Educator — Barcode scan & kit usage</option>
                  <option value="viewer">Auditor / Observer — Read-only reports & valuation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reset Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep existing password"
                  value={editForm.password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-100 font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Account Status</span>
                  <p className="text-[10px] text-slate-500">Allow user to sign in to Experimind platform.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className={`px-3 py-1 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                    editForm.is_active ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {editForm.is_active ? 'Active' : 'Suspended'}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs transition-all shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-fadeIn space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Remove Team Member?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{deletingUser.name || deletingUser.email}</strong>? They will immediately lose access to the system.
              </p>
            </div>
            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={saving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Removing...' : 'Yes, Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite/Add Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fadeIn space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Add Team Member</h3>
                  <p className="text-[11px] text-slate-500">Provision enterprise credentials & assign role.</p>
                </div>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="ramesh@experimindlabs.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Initial Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-100 font-mono"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Assigned Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-100 font-semibold"
                >
                  <option value="admin">Administrator — Full control, settings & compliance</option>
                  <option value="editor">Inventory Manager — Stock in/out, kits & POs</option>
                  <option value="employee">Lab Staff / Educator — Barcode scan & kit usage</option>
                  <option value="viewer">Auditor / Observer — Read-only reports & valuation</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs transition-all shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Creating Member...' : 'Provision Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Sessions Modal */}
      <ActiveSessionsModal
        isOpen={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
      />
    </div>
  );
};
