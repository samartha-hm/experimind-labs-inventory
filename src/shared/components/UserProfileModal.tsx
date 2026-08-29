import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Mail,
  Shield,
  Key,
  Check,
  X,
  ShieldCheck,
  Building2,
  Lock,
  Sparkles,
  Save,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/src/AuthContext';
import { apiFetch } from '@/src/utils/api';
import { useToast } from '@/src/contexts/ToastContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_GRADIENTS = [
  { id: 'indigo', label: 'Royal Indigo', bg: 'from-indigo-600 to-purple-600' },
  { id: 'emerald', label: 'Emerald Mint', bg: 'from-emerald-600 to-teal-600' },
  { id: 'rose', label: 'Ruby Sunset', bg: 'from-rose-600 to-amber-600' },
  { id: 'cyan', label: 'Ocean Cyan', bg: 'from-cyan-600 to-blue-600' },
  { id: 'amber', label: 'Golden Amber', bg: 'from-amber-500 to-orange-600' },
  { id: 'purple', label: 'Cosmic Violet', bg: 'from-purple-600 to-pink-600' },
];

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, role, updateCurrentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'permissions'>('profile');
  const [name, setName] = useState(user?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    return localStorage.getItem('experimind_avatar_style') || 'indigo';
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen || !user) return null;

  const currentGradient = AVATAR_GRADIENTS.find(a => a.id === selectedAvatar) || AVATAR_GRADIENTS[0];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      await apiFetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() })
      });

      updateCurrentUser({ name: name.trim() });
      localStorage.setItem('experimind_avatar_style', selectedAvatar);
      showToast('success', 'Profile Updated', 'Your profile details have been saved.');
      onClose();
    } catch (e: any) {
      alert(`Failed to update profile: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.newPassword) return;
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      await apiFetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: passwordForm.newPassword })
      });

      setPasswordForm({ newPassword: '', confirmPassword: '' });
      showToast('success', 'Security Updated', 'Your account password has been updated.');
      onClose();
    } catch (e: any) {
      alert(`Failed to change password: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const roleName = role === 'admin' ? 'Administrator' : role === 'editor' ? 'Inventory Manager' : role === 'employee' ? 'Lab Staff / Educator' : 'Auditor (Observer)';

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-fadeIn my-auto text-slate-900 dark:text-white">
        
        {/* Modal Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 pt-1">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentGradient.bg} flex items-center justify-center text-white text-2xl font-black shadow-lg ring-4 ring-white/10 shrink-0`}>
              {(name || user.email).charAt(0).toUpperCase()}
            </div>

            <div className="truncate pr-6">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white truncate">{name || 'Team Member'}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 uppercase shrink-0">
                  {roleName}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5 truncate">{user.email}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Account Details
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Security & Password
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'permissions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Role & Permissions
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Managed by enterprise organization policy.</span>
              </div>

              {/* Avatar Style Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Avatar Theme Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_GRADIENTS.map((gradient) => (
                    <button
                      key={gradient.id}
                      type="button"
                      onClick={() => setSelectedAvatar(gradient.id)}
                      className={`h-10 rounded-xl bg-gradient-to-tr ${gradient.bg} flex items-center justify-center text-white transition-all cursor-pointer shadow-xs ${
                        selectedAvatar === gradient.id ? 'ring-3 ring-indigo-500 scale-105 shadow-md' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={gradient.label}
                    >
                      {selectedAvatar === gradient.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>Choose a strong password with at least 6 characters.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{saving ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Current Role</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 capitalize">{roleName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Organization Tenant</span>
                  <span className="font-mono font-semibold">Experimind Labs (HQ)</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Session Security</span>
                  <span className="font-semibold text-emerald-600">Encrypted JWT • HttpOnly</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 dark:text-slate-300">Included Privileges</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Real-time inventory lookup and visual storage allotments</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Barcode scanning and stock movement logging</span>
                  </div>
                  {role === 'admin' && (
                    <>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Full user directory provisioning and RBAC administration</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Financial valuation export and audit log inspection</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
