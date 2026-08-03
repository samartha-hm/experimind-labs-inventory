import React from 'react';
import { Bot, X, CheckCircle2, Clock, Terminal, ShieldCheck, Database, Layers } from 'lucide-react';

interface AIAgentResearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIAgentResearchDrawer({ isOpen, onClose }: AIAgentResearchDrawerProps) {
  if (!isOpen) return null;

  const LOGS = [
    { timestamp: '18:38:12', type: 'lease', text: 'Leased 324 PostgreSQL inventory rows for background research loop.' },
    { timestamp: '18:38:14', type: 'scan', text: 'Scanned stock levels: 163 SKUs flagged below reorder threshold.' },
    { timestamp: '18:38:15', type: 'evidence', text: 'Gathered vendor lead time evidence for SKU "inv_item_8829" (Wash bottles).' },
    { timestamp: '18:38:18', type: 'suggestion', text: 'Pushed human-in-the-loop suggestion #sug_1 to client browser queue.' },
    { timestamp: '18:38:22', type: 'idle', text: 'Agent sleeping until next schedule interval (300s).' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-[9999] animate-fadeIn">
      <div className="bg-slate-950 text-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between border-l border-slate-800 animate-slideLeft space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">CompAI Agent Research Notebook</h3>
                <p className="text-[10px] text-slate-400 font-mono">Durable Background Task Loop (No-Guessing Engine)</p>
              </div>
            </div>

            <button onClick={onClose} className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Agent Status</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active Background Lease
              </span>
            </div>

            <div className="text-xs space-y-1 text-slate-300">
              <div className="flex justify-between"><span className="text-slate-500">Database Engine:</span> <span className="font-mono">PostgreSQL 18</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Scheduled Task Interval:</span> <span className="font-mono">Every 5 Minutes</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Evidence Verification:</span> <span className="font-mono text-emerald-400">Strict (No Guessing)</span></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Execution Task Log
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2.5 font-mono text-[11px] max-h-72 overflow-y-auto custom-scrollbar">
              {LOGS.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                  <span className={log.type === 'suggestion' ? 'text-amber-400 font-bold' : log.type === 'evidence' ? 'text-emerald-400' : 'text-slate-300'}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 text-center font-mono">
          CompAI Agentic Workflow Engine • Human-in-the-Loop Safeguard Active
        </div>
      </div>
    </div>
  );
}
