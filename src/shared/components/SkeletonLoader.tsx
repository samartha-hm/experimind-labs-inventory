import React from 'react';

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3.5 rounded-lg"
          style={{
            width: i === lines - 1 && lines > 1 ? '65%' : i === 0 ? '90%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <div className="skeleton w-24 h-4 rounded-md" />
        <div className="skeleton w-8 h-8 rounded-xl" />
      </div>
      <div className="skeleton w-32 h-7 rounded-lg" />
      <div className="skeleton w-44 h-3.5 rounded-md" />
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, cols = 5, className = '' }: SkeletonTableProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Table Header Shimmer */}
      <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-4 rounded-md flex-1" />
        ))}
      </div>

      {/* Table Rows Shimmer */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3.5 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="skeleton h-3.5 rounded-md flex-1"
                style={{
                  opacity: 1 - c * 0.1,
                  maxWidth: c === 0 ? '180px' : undefined,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonChartProps {
  className?: string;
  height?: string;
}

export function SkeletonChart({ className = '', height = 'h-64' }: SkeletonChartProps) {
  return (
    <div
      className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="skeleton w-36 h-5 rounded-md" />
          <div className="skeleton w-48 h-3 rounded-md" />
        </div>
        <div className="skeleton w-20 h-7 rounded-xl" />
      </div>

      <div className={`skeleton w-full ${height} rounded-2xl flex items-end justify-between p-4 gap-2`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-full bg-slate-300/30 dark:bg-slate-700/30 rounded-t-lg"
            style={{ height: `${30 + (i * 17) % 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default {
  Text: SkeletonText,
  Card: SkeletonCard,
  Table: SkeletonTable,
  Chart: SkeletonChart,
};
