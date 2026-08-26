import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Smartphone, 
  Globe, 
  ShieldAlert, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  LogOut,
  X,
  AlertTriangle
} from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import { useAuth } from '../../../AuthContext';

interface SessionData {
  id: string;
  user_id: string;
  device_info: string;
  ip_address: string;
  location: string;
  last_active_at: string;
  expires_at: string;
  is_revoked: boolean;
}

interface ActiveSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActiveSessionsModal: React.FC<ActiveSessionsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/v1/sessions/me');
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (e: any) {
      console.error('Failed to load active sessions', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRevokeSingle = async (sessionId: string) => {
    try {
      setRevoking(true);
      await apiFetch(`/api/v1/sessions/${sessionId}/revoke`, { method: 'POST' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setStatusMsg('Device session terminated successfully.');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      alert(`Revocation error: ${e.message}`);
    } finally {
      setRevoking(false);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm('Are you sure you want to terminate all other active logins across other devices? You will remain logged in on this terminal.')) {
      return;
    }
    try {
      setRevoking(true);
      const res = await apiFetch('/api/v1/sessions/revoke-all-others', { method: 'POST' });
      await fetchSessions();
      setStatusMsg(res.message || 'All other sessions terminated.');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      alert(`Revocation error: ${e.message}`);
    } finally {
      setRevoking(false);
    }
  };

  const getDeviceIcon = (device: string) => {
    const d = device.toLowerCase();
    if (d.includes('mobile') || d.includes('android') || d.includes('iphone')) {
      return <Smartphone className="w-5 h-5 text-amber-400" />;
    }
    return <Laptop className="w-5 h-5 text-indigo-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-scale-up space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-900/40 text-indigo-400 rounded-xl border border-indigo-700/50">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Active Login Sessions & Security</h3>
              <p className="text-xs text-slate-400">
                Manage connected workstations, barcode terminals, and remote sessions for <span className="text-indigo-400 font-mono">{user?.email}</span>.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Sessions List */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-indigo-400" />
              <p className="text-sm">Auditing active sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 text-sm">
              No additional active sessions detected.
            </div>
          ) : (
            sessions.map((sess, idx) => {
              const isCurrent = idx === 0; // Top session is current
              return (
                <div
                  key={sess.id}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                    isCurrent 
                      ? 'bg-indigo-950/30 border-indigo-500/40' 
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                      {getDeviceIcon(sess.device_info)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">{sess.device_info}</span>
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded-full border border-emerald-700/50">
                            Current Device
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-slate-500" />
                          {sess.ip_address}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          Last active: {new Date(sess.last_active_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeSingle(sess.id)}
                      disabled={revoking}
                      className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg text-xs font-semibold border border-red-800/50 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={handleRevokeAllOthers}
            disabled={revoking || sessions.length <= 1}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-xl font-semibold text-xs border border-red-600/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <LogOut className="w-4 h-4" />
            Terminate All Other Sessions
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-sm transition-all border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
