import React, { useState } from 'react';
import { Sparkles, Check, X, ArrowRight, ShieldCheck, ChevronRight, Bot } from 'lucide-react';
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

  if (suggestions.length === 0) return null;

  const current = suggestions[currentIndex % suggestions.length];

  const handleAccept = () => {
    showToast('success', `Human-in-the-Loop Confirmed: ${current.actionText}`, current.title);
    setSuggestions(prev => prev.filter(s => s.id !== current.id));
  };

  const handleReject = () => {
    showToast('info', 'AI Suggestion Dismissed', current.title);
    setSuggestions(prev => prev.filter(s => s.id !== current.id));
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2.5 border-b border-indigo-500/30 flex items-center justify-between gap-4 text-xs shadow-md animate-fadeIn">
      {/* Left: Agent Badge & Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0">
          <Bot className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> CompAI Research Agent
        </span>

        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-white truncate">{current.title}</span>
          <span className="text-slate-400 hidden lg:inline font-medium">({current.description})</span>
        </div>
      </div>

      {/* Right: Human-in-the-Loop Confirm / Dismiss Buttons */}
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
    </div>
  );
}
