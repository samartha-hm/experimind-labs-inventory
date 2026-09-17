import React from 'react';
import { useToast } from '@/src/contexts/ToastContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 md:top-6 md:right-6 z-[99999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none transition-all"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all transform animate-slideIn ${
            toast.type === 'success'
              ? 'bg-slate-900/95 text-emerald-100 border-emerald-500/40 shadow-emerald-950/40'
              : toast.type === 'error'
              ? 'bg-slate-900/95 text-rose-100 border-rose-500/40 shadow-rose-950/40'
              : toast.type === 'warning'
              ? 'bg-slate-900/95 text-amber-100 border-amber-500/40 shadow-amber-950/40'
              : 'bg-slate-900/95 text-indigo-100 border-indigo-500/40 shadow-indigo-950/40'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-400" />}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs font-bold leading-snug tracking-tight text-white">{toast.title}</h4>
            {toast.message && (
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug break-words">{toast.message}</p>
            )}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
