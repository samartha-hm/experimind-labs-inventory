import React from 'react';
import { useToast } from '@/src/contexts/ToastContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all transform animate-slideIn ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-100 border-emerald-800/80 shadow-emerald-950/20'
              : toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-100 border-rose-800/80 shadow-rose-950/20'
              : toast.type === 'warning'
              ? 'bg-amber-950/90 text-amber-100 border-amber-800/80 shadow-amber-950/20'
              : 'bg-indigo-950/90 text-indigo-100 border-indigo-800/80 shadow-indigo-950/20'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold leading-tight tracking-wide">{toast.title}</h4>
            {toast.message && <p className="text-[11px] opacity-80 mt-1 leading-snug">{toast.message}</p>}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
