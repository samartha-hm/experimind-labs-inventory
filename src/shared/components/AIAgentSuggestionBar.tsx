import React, { useState } from 'react';
import { Sparkles, Check, X, ArrowRight, ShieldCheck, ChevronRight, Bot, Search } from 'lucide-react';
import { useToast } from '@/src/contexts/ToastContext';

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  actionText: string;
  badge: string;
  data?: any;
}

const INITIAL_SUGGESTIONS: AISuggestion[] = [
  {
    id: 'sug_1',
    title: 'CompAI Agent Suggestion: Auto-Generate PO for Wash Bottles',
    description: 'Current stock is 2 pcs (Threshold: 5 pcs). Recommended reorder: 25 pcs from Vendor "Experimind Supplies".',
    actionText: 'Generate Draft PO',
    badge: 'Stock Shortage',
  },
  {
    id: 'sug_2',
    title: 'CompAI Agent Suggestion: Optimize Kit Assembly Batch',
    description: 'We have enough subassemblies to pack 5 additional "Arduino Starter Kits" without purchasing new parts.',
    actionText: 'Trigger Assembly Batch',
    badge: 'Kitting Optimization',
  },
];

interface AIAgentSuggestionBarProps {
  onOpenResearchDrawer?: () => void;
}

export default function AIAgentSuggestionBar({ onOpenResearchDrawer }: AIAgentSuggestionBarProps) {
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(INITIAL_SUGGESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nlQuery, setNlQuery] = useState('');

  const current = suggestions.length > 0 ? suggestions[currentIndex % suggestions.length] : null;

  const handleAccept = () => {
    if (!current) return;
    showToast('success', `Human-in-the-Loop Confirmed: ${current.actionText}`, current.title);
    setSuggestions(prev => prev.filter(s => s.id !== current.id));
  };

  const handleReject = () => {
    if (!current) return;
    showToast('info', 'AI Suggestion Dismissed', current.title);
    setSuggestions(prev => prev.filter(s => s.id !== current.id));
  };

  const handleNlQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlQuery) return;
    showToast('info', 'CompAI Natural Language Query Executed', `Analyzing: "${nlQuery}" via Gemini 3.1 Pro reasoning engine`);
    setNlQuery('');
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2 border-b border-indigo-500/30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs shadow-md animate-fadeIn">
      {/* Left: Agent Badge & Suggestion Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0">
          <Bot className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> CompAI Agent
        </span>

        {current ? (
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-white truncate">{current.title}</span>
            <span className="text-slate-400 hidden xl:inline font-medium">({current.description})</span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs italic">CompAI agent monitoring live stock & procurement streams...</span>
        )}
      </div>

      {/* Middle: Natural Language Query Input */}
      <form onSubmit={handleNlQuerySubmit} className="relative max-w-xs w-full hidden md:block">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
        <input
          type="text"
          placeholder="Ask CompAI (e.g. 'top 5 slow movers')..."
          value={nlQuery}
          onChange={(e) => setNlQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1 bg-slate-950/80 border border-indigo-500/40 rounded-xl text-[11px] text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 transition-all font-mono"
        />
      </form>

      {/* Right: Human-in-the-Loop Confirm / Dismiss Buttons */}
      {current && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAccept}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-xl text-[11px] transition-all flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <Check className="w-3.5 h-3.5" /> Confirm ({current.actionText})
          </button>

          <button
            onClick={handleReject}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2.5 py-1 rounded-xl text-[11px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Dismiss
          </button>

          {onOpenResearchDrawer && (
            <button
              onClick={onOpenResearchDrawer}
              className="text-indigo-300 hover:text-white font-bold px-2 py-1 text-[11px] underline flex items-center gap-1 cursor-pointer ml-1"
            >
              View Evidence <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
