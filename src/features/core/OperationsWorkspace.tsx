import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, ClipboardList, PackageCheck, Boxes, FolderKanban } from 'lucide-react';
import { InventoryItem, KitBOM } from '@/src/types';
import { useData } from '@/src/DataContext';
import { buildOperationsQueue } from './operationsQueue';

interface OperationsWorkspaceProps {
  inventory: InventoryItem[];
  kits: KitBOM[];
  onNavigate: (tab: string) => void;
  onOpenBarcodeScanner?: () => void;
}

export default function OperationsWorkspace({
  inventory,
  kits,
  onNavigate,
  onOpenBarcodeScanner,
}: OperationsWorkspaceProps) {
  const { purchaseOrders = [], salesOrders = [] } = useData();
  const queue = useMemo(
    () => buildOperationsQueue(inventory, purchaseOrders, salesOrders, kits),
    [inventory, purchaseOrders, salesOrders, kits],
  );

  const cards = [
    {
      label: 'Low stock',
      value: queue.lowStock,
      description: 'Items need replenishment',
      tab: 'inventory',
      icon: AlertTriangle,
      tone: 'amber',
    },
    {
      label: 'Replenishment',
      value: queue.replenishment,
      description: 'Deliveries still open',
      tab: 'purchase_orders',
      icon: ClipboardList,
      tone: 'blue',
    },
    {
      label: 'Fulfillment',
      value: queue.fulfillment,
      description: 'Orders need action',
      tab: 'sales_orders',
      icon: PackageCheck,
      tone: 'indigo',
    },
    {
      label: 'Project kits',
      value: queue.projects,
      description: 'Reusable kits available',
      tab: 'projects_hub',
      icon: FolderKanban,
      tone: 'emerald',
    },
  ] as const;
  const toneClasses = {
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">Operations</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">What needs attention today?</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              One working view for stock, incoming replenishment, fulfillment, and project preparation.
            </p>
          </div>
          {onOpenBarcodeScanner && (
            <button
              type="button"
              onClick={onOpenBarcodeScanner}
              className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-500"
            >
              Scan an item
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Operational queues">
        {cards.map(({ label, value, description, tab, icon: Icon, tone }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(tab)}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`rounded-xl p-2.5 ${toneClasses[tone]}`}>
                <Icon className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-500" />
            </div>
            <p className="mt-5 text-3xl font-black text-slate-900 dark:text-white">{value}</p>
            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{label}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </button>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => onNavigate('inventory')}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <Boxes className="h-5 w-5 text-indigo-500" />
          <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Check stock</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Find an item, location, available quantity, or movement history.</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('purchase_orders')}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <ClipboardList className="h-5 w-5 text-blue-500" />
          <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Follow up delivery</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Track ordered, in-transit, partial, and received quantities.</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('projects_hub')}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <FolderKanban className="h-5 w-5 text-emerald-500" />
          <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Prepare a project kit</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Check requirements, shortages, preparation, labels, and packing.</p>
        </button>
      </section>
    </div>
  );
}
