import React from 'react';

interface DiffViewerProps {
  key?: React.Key;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  label: string;
}

export default function DiffViewer({ oldValue, newValue, label }: DiffViewerProps) {
  if (oldValue === newValue) return null;

  return (
    <div className="flex flex-col gap-1 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
      <div className="font-bold text-slate-700">{label}</div>
      <div className="flex flex-col gap-1">
        {oldValue !== undefined && oldValue !== null && (
          <div className="flex items-start gap-2 text-rose-700 bg-rose-50 px-2 py-1 rounded">
            <span className="font-mono text-rose-500 font-bold">-</span>
            <span className="break-all">{String(oldValue)}</span>
          </div>
        )}
        {newValue !== undefined && newValue !== null && (
          <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
            <span className="font-mono text-emerald-500 font-bold">+</span>
            <span className="break-all">{String(newValue)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
