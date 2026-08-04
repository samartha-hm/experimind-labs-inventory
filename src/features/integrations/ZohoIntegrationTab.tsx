import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownLeft, Database, Link2, FileText, Building2, Check, Play } from 'lucide-react';
import { useToast } from '@/src/contexts/ToastContext';
import { ZohoSyncLog } from '@/src/types';

export default function ZohoIntegrationTab() {
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const [syncLogs, setSyncLogs] = useState<ZohoSyncLog[]>([
    {
      id: 'log_1',
      timestamp: '2026-08-04 11:20:15',
      entityType: 'INVOICE',
      action: 'PUSH',
      status: 'SUCCESS',
      zohoId: 'zh_inv_99881',
      localId: 'INV-2026-0089',
      message: 'Pushed Invoice INV-2026-0089 to Zoho Books Sales Invoices.',
    },
    {
      id: 'log_2',
      timestamp: '2026-08-04 10:45:00',
      entityType: 'VENDOR',
      action: 'PULL',
      status: 'SUCCESS',
      zohoId: 'zh_vend_4412',
      localId: 'VEND-001',
      message: 'Pulled updated vendor credit terms from Zoho Books Contact Directory.',
    },
    {
      id: 'log_3',
      timestamp: '2026-08-04 09:12:30',
      entityType: 'BILL',
      action: 'PUSH',
      status: 'SUCCESS',
      zohoId: 'zh_bill_2210',
      localId: 'PO-2026-0042',
      message: 'Created Purchase Bill in Zoho Books for PO-2026-0042.',
    },
  ]);

  const [coaMapping, setCoaMapping] = useState({
    inventoryAsset: '1300 - Inventory Asset',
    cogs: '5000 - Cost of Goods Sold',
    salesRevenue: '4000 - Sales Revenue',
    vendorPurchases: '5100 - Vendor Purchases & Bills',
  });

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const newLog: ZohoSyncLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        entityType: 'INVOICE',
        action: 'PUSH',
        status: 'SUCCESS',
        zohoId: `zh_inv_${Math.floor(10000 + Math.random() * 90000)}`,
        localId: 'INV-2026-0091',
        message: 'Two-way sync completed cleanly. Synchronized 4 invoices, 2 bills, and 1 partner record.',
      };
      setSyncLogs(prev => [newLog, ...prev]);
      setIsSyncing(false);
      showToast('success', 'Zoho Books 2-Way Sync Complete', 'Successfully synchronized accounting ledgers with Zoho Books');
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-500/40 uppercase">
              ACCOUNTING INTEGRATION
            </span>
            <span className="text-slate-300 text-xs font-medium">• Organization ID: 89012345</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Zoho Books 2-Way Sync Hub</h2>
          <p className="text-xs text-slate-300">
            Real-time automated synchronization of Invoices, Bills, Chart of Accounts, and Partner directories.
          </p>
        </div>

        <button
          onClick={handleTriggerSync}
          disabled={isSyncing}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Synchronizing...' : 'Trigger 2-Way Sync Now'}
        </button>
      </div>

      {/* COA Mapping & Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection & COA Mapping Column */}
        <div className="space-y-6">
          {/* Connection Status Box */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">OAuth 2.0 Connection</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Zoho Books Production API</p>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                CONNECTED
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex justify-between font-mono">
                <span>Account Region:</span>
                <span className="font-bold text-slate-800">Zoho IN (.in)</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Auto-Sync Schedule:</span>
                <span className="font-bold text-blue-600">Every 15 Mins</span>
              </div>
            </div>
          </div>

          {/* Chart of Accounts Mapping */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">
              Chart of Accounts (COA) Mapping
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Inventory Asset Account</label>
                <input
                  type="text"
                  value={coaMapping.inventoryAsset}
                  onChange={(e) => setCoaMapping({ ...coaMapping, inventoryAsset: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cost of Goods Sold (COGS)</label>
                <input
                  type="text"
                  value={coaMapping.cogs}
                  onChange={(e) => setCoaMapping({ ...coaMapping, cogs: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sales Revenue Account</label>
                <input
                  type="text"
                  value={coaMapping.salesRevenue}
                  onChange={(e) => setCoaMapping({ ...coaMapping, salesRevenue: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vendor Purchases Account</label>
                <input
                  type="text"
                  value={coaMapping.vendorPurchases}
                  onChange={(e) => setCoaMapping({ ...coaMapping, vendorPurchases: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sync Log Monitor Column */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-base">Two-Way Sync Log & Reconciliation</h3>
            <span className="text-xs font-bold text-slate-500 font-mono">{syncLogs.length} Sync Events</span>
          </div>

          <div className="space-y-3">
            {syncLogs.map((log) => (
              <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`p-1 rounded-lg ${log.action === 'PUSH' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {log.action === 'PUSH' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                    </span>
                    <span className="font-bold text-slate-800 font-mono">{log.entityType}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                  </div>

                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    {log.status}
                  </span>
                </div>

                <p className="text-slate-600 font-medium">{log.message}</p>

                <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/60">
                  <span>Local ID: <strong className="text-slate-700">{log.localId}</strong></span>
                  <span>Zoho Ref: <strong className="text-slate-700">{log.zohoId}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
