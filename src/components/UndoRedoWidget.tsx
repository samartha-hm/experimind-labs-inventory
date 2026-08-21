import React, { useState, useMemo } from 'react';
import { useUndoRedo, UndoableAction } from '@/src/contexts/UndoRedoContext';
import {
  Undo2,
  Redo2,
  Loader2,
  History,
  CheckSquare,
  Square,
  RotateCcw,
  Clock,
  Sparkles,
  ChevronUp,
  ChevronDown,
  X,
  Trash2,
  ArrowLeftRight,
  Filter,
  CheckCircle2,
  Layers,
  Search
} from 'lucide-react';

export default function UndoRedoWidget() {
  const {
    past,
    future,
    undo,
    redo,
    undoMultiple,
    redoMultiple,
    undoSpecificAction,
    undoBatch,
    rollbackTo,
    clearHistory,
    isProcessing
  } = useUndoRedo();

  // Console Drawer Expand State
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'past' | 'future'>('past');
  const [searchFilter, setSearchFilter] = useState('');

  // Selected Action IDs for Batch Undo
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());

  const nextUndo = past.length > 0 ? past[past.length - 1] : null;
  const nextRedo = future.length > 0 ? future[0] : null;

  // Filtered Actions in Timeline
  const filteredPast = useMemo(() => {
    const list = [...past].reverse(); // newest first
    if (!searchFilter.trim()) return list;
    return list.filter(a => a.name.toLowerCase().includes(searchFilter.toLowerCase()));
  }, [past, searchFilter]);

  const filteredFuture = useMemo(() => {
    if (!searchFilter.trim()) return future;
    return future.filter(a => a.name.toLowerCase().includes(searchFilter.toLowerCase()));
  }, [future, searchFilter]);

  const toggleSelectAction = (id: string) => {
    setSelectedActionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedActionIds(new Set(filteredPast.map(a => a.id)));
  };

  const handleClearSelection = () => {
    setSelectedActionIds(new Set());
  };

  const handleExecuteBatchUndo = async () => {
    const ids = Array.from(selectedActionIds);
    if (ids.length === 0) return;
    await undoBatch(ids);
    setSelectedActionIds(new Set());
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DOCKED FLOATING PILL (ALWAYS VISIBLE & CLEAN) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 right-5 z-[9990] flex items-center gap-1.5 bg-slate-950/95 text-white p-1.5 rounded-2xl shadow-2xl border border-slate-800/90 backdrop-blur-xl animate-fadeIn select-none">
        
        {/* Quick Undo Button */}
        <button
          onClick={() => undo()}
          disabled={!nextUndo || isProcessing}
          title={nextUndo ? `Undo: ${nextUndo.name} (Ctrl+Z)` : 'Nothing to Undo (Ctrl+Z)'}
          className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            !nextUndo || isProcessing
              ? 'opacity-40 cursor-not-allowed text-slate-500'
              : 'hover:bg-slate-800 text-slate-200 hover:text-white active:scale-95'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          ) : (
            <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Undo2 className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="flex flex-col text-left">
            <span className="text-[9px] uppercase font-mono font-bold text-indigo-300">Undo</span>
            <span className="text-xs font-bold truncate max-w-[130px] hidden sm:inline text-slate-200">
              {nextUndo ? nextUndo.name : 'No History'}
            </span>
          </div>
          {past.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 font-mono text-[9px] font-bold border border-indigo-500/40">
              {past.length}
            </span>
          )}
        </button>

        <div className="w-px h-6 bg-slate-800" />

        {/* Quick Redo Button */}
        <button
          onClick={() => redo()}
          disabled={!nextRedo || isProcessing}
          title={nextRedo ? `Redo: ${nextRedo.name} (Ctrl+Y)` : 'Nothing to Redo (Ctrl+Y)'}
          className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            !nextRedo || isProcessing
              ? 'opacity-40 cursor-not-allowed text-slate-500'
              : 'hover:bg-slate-800 text-slate-200 hover:text-white active:scale-95'
          }`}
        >
          {future.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-500/40">
              {future.length}
            </span>
          )}
          <div className="flex flex-col text-right">
            <span className="text-[9px] uppercase font-mono font-bold text-emerald-300">Redo</span>
            <span className="text-xs font-bold truncate max-w-[130px] hidden sm:inline text-slate-200">
              {nextRedo ? nextRedo.name : 'No Actions'}
            </span>
          </div>
          <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Redo2 className="w-3.5 h-3.5" />
          </div>
        </button>

        <div className="w-px h-6 bg-slate-800" />

        {/* Action Timeline Hub Toggle Button */}
        <button
          onClick={() => setIsConsoleOpen(!isConsoleOpen)}
          title="Open Action History & Batch Rollback Console"
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
            isConsoleOpen
              ? 'bg-indigo-600 text-white shadow-md'
              : 'hover:bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <History className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-bold hidden md:inline">Timeline</span>
          {isConsoleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXPANDABLE ACTION TIMELINE & BATCH ROLLBACK CONSOLE */}
      {/* ========================================================================= */}
      {isConsoleOpen && (
        <div className="fixed bottom-20 right-5 z-[9991] w-full max-w-lg bg-slate-950/95 text-white rounded-3xl shadow-2xl border border-slate-800 backdrop-blur-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4 max-h-[78vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  Action Timeline & Batch Rollback
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  Select and revert specific actions or roll back to any point in time
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={clearHistory}
                disabled={past.length === 0 && future.length === 0}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer disabled:opacity-30 text-[10px] flex items-center gap-1"
                title="Clear all action history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
              <button
                onClick={() => setIsConsoleOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Multi-Step Undo Buttons Bar */}
          <div className="flex items-center justify-between gap-2 p-2 bg-slate-900/80 rounded-2xl border border-slate-800 shrink-0 text-xs">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase pl-1">
              Quick Rollback:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => undoMultiple(3)}
                disabled={past.length < 3 || isProcessing}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white font-bold text-[10px] transition-colors cursor-pointer disabled:opacity-30 border border-slate-700"
              >
                Undo 3 Steps
              </button>
              <button
                onClick={() => undoMultiple(5)}
                disabled={past.length < 5 || isProcessing}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white font-bold text-[10px] transition-colors cursor-pointer disabled:opacity-30 border border-slate-700"
              >
                Undo 5 Steps
              </button>
              <button
                onClick={() => undoMultiple(past.length)}
                disabled={past.length === 0 || isProcessing}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white font-bold text-[10px] transition-colors cursor-pointer disabled:opacity-30 border border-slate-700"
              >
                Undo All ({past.length})
              </button>
            </div>
          </div>

          {/* Search & Tabs Switcher */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
              <button
                onClick={() => setActiveTab('past')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'past' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5 text-indigo-300" />
                <span>Undo History ({past.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('future')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'future' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Redo2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Redo Stack ({future.length})</span>
              </button>
            </div>

            <div className="relative w-36 sm:w-44">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter actions..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-7 pr-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Batch Selection Action Bar (Visible when items selected in Past tab) */}
          {activeTab === 'past' && past.length > 0 && (
            <div className="flex items-center justify-between gap-2 p-2 bg-indigo-950/40 rounded-xl border border-indigo-800/60 shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-[10px] font-bold text-indigo-300 hover:text-white cursor-pointer"
                >
                  Select All ({filteredPast.length})
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={handleClearSelection}
                  className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              {selectedActionIds.size > 0 && (
                <button
                  onClick={handleExecuteBatchUndo}
                  disabled={isProcessing}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo Selected ({selectedActionIds.size})</span>
                </button>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: PAST ACTIONS TIMELINE (UNDO STACK) */}
          {/* ========================================================================= */}
          {activeTab === 'past' && (
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
              {filteredPast.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl space-y-1">
                  <Clock className="w-6 h-6 text-slate-600 mx-auto" />
                  <p className="font-bold text-slate-400">No actions recorded yet</p>
                  <p className="text-[10px]">Stock changes, bin relocations, and BOM edits will appear here</p>
                </div>
              ) : (
                filteredPast.map((action, revIdx) => {
                  const actualIndex = past.length - 1 - revIdx;
                  const isSelected = selectedActionIds.has(action.id);
                  const isTopMost = revIdx === 0;

                  return (
                    <div
                      key={action.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs group select-none ${
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-500/30'
                          : isTopMost
                          ? 'bg-slate-900/90 border-slate-700 hover:border-slate-500'
                          : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Left: Checkbox + Action Name + Timestamp */}
                      <div className="flex items-center gap-2.5 truncate">
                        <button
                          type="button"
                          onClick={() => toggleSelectAction(action.id)}
                          className="text-slate-400 hover:text-indigo-400 p-0.5 cursor-pointer shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs truncate">{action.name}</span>
                            {isTopMost && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[8px] font-bold border border-indigo-500/40 shrink-0">
                                Latest
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {action.timestamp || 'Recent'} • Step #{actualIndex + 1}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions (Selective Revert & Rollback to Point-in-Time) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Point-in-Time Rollback Button */}
                        <button
                          type="button"
                          onClick={() => rollbackTo(actualIndex - 1)}
                          disabled={isProcessing || actualIndex === past.length - 1}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-slate-950 font-bold text-[9px] transition-colors cursor-pointer disabled:opacity-20 flex items-center gap-1 border border-slate-700"
                          title="Undo all subsequent actions and roll back to this step"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span className="hidden sm:inline">Rollback to Here</span>
                        </button>

                        {/* Selective Undo This Action Button */}
                        <button
                          type="button"
                          onClick={() => undoSpecificAction(action.id)}
                          disabled={isProcessing}
                          className="px-2 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-[9px] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Undo just this individual action"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>Revert</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: REDO STACK */}
          {/* ========================================================================= */}
          {activeTab === 'future' && (
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
              {filteredFuture.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl space-y-1">
                  <Redo2 className="w-6 h-6 text-slate-600 mx-auto" />
                  <p className="font-bold text-slate-400">No actions to redo</p>
                  <p className="text-[10px]">Undone actions will appear here ready to be re-applied</p>
                </div>
              ) : (
                filteredFuture.map((action, idx) => (
                  <div
                    key={action.id || idx}
                    className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate">
                      <span className="font-bold text-white text-xs block truncate">{action.name}</span>
                      <span className="text-[10px] font-mono text-emerald-400">Redo Action #{idx + 1}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => redoMultiple(idx + 1)}
                      disabled={isProcessing}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] shadow-sm transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Redo2 className="w-3 h-3" />
                      <span>Redo to Here</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Footer Shortcuts Guide */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-400 shrink-0">
            <span>Shortcuts: <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300">Ctrl+Z</kbd> Undo • <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300">Ctrl+Y</kbd> Redo</span>
            <span className="text-indigo-400 font-bold">{past.length} Past • {future.length} Future</span>
          </div>
        </div>
      )}
    </>
  );
}
