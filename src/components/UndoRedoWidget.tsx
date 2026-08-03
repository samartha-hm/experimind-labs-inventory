import React from 'react';
import { useUndoRedo } from '@/src/contexts/UndoRedoContext';
import { Undo2, Redo2, Loader2 } from 'lucide-react';

export default function UndoRedoWidget() {
  const { past, future, undo, redo, isProcessing } = useUndoRedo();

  if (past.length === 0 && future.length === 0) return null;

  const nextUndo = past.length > 0 ? past[past.length - 1] : null;
  const nextRedo = future.length > 0 ? future[0] : null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-950 text-white p-2 rounded-2xl shadow-2xl border border-slate-800 backdrop-blur-md animate-fadeIn">
      {/* Undo Button */}
      <button
        onClick={() => undo()}
        disabled={!nextUndo || isProcessing}
        title={nextUndo ? `Undo ${nextUndo.name} (Ctrl+Z)` : 'Nothing to Undo'}
        className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer text-left ${
          !nextUndo || isProcessing
            ? 'opacity-40 cursor-not-allowed text-slate-500'
            : 'hover:bg-slate-800 text-slate-200 hover:text-white'
        }`}
      >
        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          <Undo2 className="w-4 h-4" />
        </div>
        <div className="flex flex-col max-w-[170px]">
          <span className="text-[9px] uppercase font-mono font-bold text-indigo-300 tracking-wider">Undo (Ctrl+Z)</span>
          <span className="text-xs font-bold truncate text-slate-100">
            {nextUndo ? nextUndo.name : 'No Past Actions'}
          </span>
        </div>
      </button>

      <div className="w-px h-8 bg-slate-800" />

      {/* Redo Button */}
      <button
        onClick={() => redo()}
        disabled={!nextRedo || isProcessing}
        title={nextRedo ? `Redo ${nextRedo.name} (Ctrl+Y)` : 'Nothing to Redo'}
        className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer text-left ${
          !nextRedo || isProcessing
            ? 'opacity-40 cursor-not-allowed text-slate-500'
            : 'hover:bg-slate-800 text-slate-200 hover:text-white'
        }`}
      >
        <div className="flex flex-col max-w-[170px] text-right">
          <span className="text-[9px] uppercase font-mono font-bold text-emerald-300 tracking-wider">Redo (Ctrl+Y)</span>
          <span className="text-xs font-bold truncate text-slate-100">
            {nextRedo ? nextRedo.name : 'No Future Actions'}
          </span>
        </div>
        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Redo2 className="w-4 h-4" />
        </div>
      </button>

      {isProcessing && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-md animate-pulse">
          <Loader2 className="w-3 h-3 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}
