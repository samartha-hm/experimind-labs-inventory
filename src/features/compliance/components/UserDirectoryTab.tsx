import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  Key, 
  Mail, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Sliders, 
  Laptop,
  MoreVertical,
  Edit2
} from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import { useAuth } from '../../../AuthContext';
import { ActiveSessionsModal } from './ActiveSessionsModal';

interface UserRecord {
  id: string;
  email: string;
  name?: string;
  role: string;
  status?: string;
  created_at: string;
  last_login?: string;
}

interface RoleOption {
  id: string;
  name: string;
  code: string;
  color: string;
}

export const UserDirectoryTab: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchUsersAndRoles = async () => {
    try {
      setLoading(true);
      const [uData, rData] = await Promise.all([
        apiFetch('/api/v1/users'),
        apiFetch('/api/v1/rbac/roles')
      ]);
      if (Array.isArray(uData)) setUsers(uData);
      if (Array.isArray(rData)) setRoles(rData);
    } catch (e: any) {
      console.error('Failed to load user directory', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
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
      setNewUser({ name: '', email: '', password: '', role: 'staff' });
      await fetchUsersAndRoles();
      setToastMsg(`User ${newUser.email} added successfully.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e: any) {
      alert(`Error creating user: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, newRoleCode: string) => {
    try {
      await apiFetch('/api/v1/rbac/assign', {
        method: 'POST',
        body: JSON.stringify({ userId, roleCode: newRoleCode })
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRoleCode } : u));
      setToastMsg('User role updated successfully.');
      setTimeout(() => setToastMsg(null), 2500);
    } catch (e: any) {
      alert(`Role assignment error: ${e.message}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (roleCode: string) => {
    const r = roles.find(r => r.code === roleCode);
    const label = r ? r.name : roleCode;
    switch (roleCode) {
      case 'super_admin':
      case 'admin':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-900/40 text-indigo-400 border border-indigo-700/50">{label}</span>;
      case 'warehouse_manager':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-700/50">{label}</span>;
      case 'procurement_specialist':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-900/40 text-blue-400 border border-blue-700/50">{label}</span>;
      case 'floor_operator':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-900/40 text-amber-400 border border-amber-700/50">{label}</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">{label}</span>;
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
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">Enterprise User Directory & Access</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage organization members, assign operational roles, audit login sessions, and control security policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSessionsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-sm transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
          >
            <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Active Sessions
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Team Member
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
          <span>Total Members:</span>
          <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            {filteredUsers.length}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Member Name / Email</th>
                <th className="py-3.5 px-4">Assigned Role</th>
                <th className="py-3.5 px-4">Quick Role Reassignment</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-indigo-500 dark:text-indigo-400" />
                    Loading directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No members match the search query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const roleBadge = getRoleBadge(user.role);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                              {user.name || 'Anonymous User'}
                              {user.role === 'admin' && (
                                <span className="flex items-center gap-0.5 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                                  <Shield className="w-2.5 h-2.5" /> Org Admin
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${roleBadge.bg}`}>
                          {roleBadge.name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-750 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="admin">Super Administrator</option>
                          <option value="manager">Warehouse Manager</option>
                          <option value="staff">Procurement / Staff</option>
                          <option value="viewer">Auditor (Read-Only)</option>
                          {roles.filter(r => !['admin','manager','staff','viewer'].includes(r.code)).map(r => (
                            <option key={r.id} value={r.code}>{r.name}</option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Add Team Member
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@experimindlabs.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Assigned Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {roles.map(r => (
                    <option key={r.code} value={r.code}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30"
                >
                  {saving ? 'Creating...' : 'Provision Member'}
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
