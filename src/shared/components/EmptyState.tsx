import React from 'react';
import {
  Box,
  ClipboardList,
  Search,
  Warehouse,
  Filter,
  Plus,
  ArrowRight,
} from 'lucide-react';

export type EmptyStatePreset = 'items' | 'orders' | 'search' | 'warehouse' | 'filter';

interface EmptyStateProps {
  preset?: EmptyStatePreset;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  className?: string;
}

const PRESET_ICONS: Record<EmptyStatePreset, React.ReactNode> = {
  items: <Box className="w-10 h-10 text-indigo-500" />,
  orders: <ClipboardList className="w-10 h-10 text-purple-500" />,
  search: <Search className="w-10 h-10 text-slate-400" />,
  warehouse: <Warehouse className="w-10 h-10 text-emerald-500" />,
  filter: <Filter className="w-10 h-10 text-amber-500" />,
};

export default function EmptyState({
  preset = 'items',
  icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  className = '',
}: EmptyStateProps) {
  const displayIcon = icon || PRESET_ICONS[preset] || PRESET_ICONS.items;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-md mx-auto my-6 animate-fadeIn ${className}`}
      role="status"
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 shadow-inner ring-1 ring-slate-200/60 dark:ring-slate-700/60">
        {displayIcon}
      </div>

      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer touch-target active:scale-95"
        >
          {actionIcon || <Plus className="w-3.5 h-3.5" />}
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
