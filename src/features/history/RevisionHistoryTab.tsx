import React, { useState } from 'react';
import { History, Search, Filter, GitCommit, User } from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useUndoRedo } from '@/src/contexts/UndoRedoContext';
import DiffViewer from '@/src/components/DiffViewer';

export default function RevisionHistoryTab() {
  const { transactions, inventory } = useData();
  const { past, undo } = useUndoRedo();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [dbAuditLogs, setDbAuditLogs] = useState<any[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/audit-log', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && Array.isArray(data.logs)) {
          const mappedLogs = data.logs.map((log: any) => ({
            id: log.id,
            timestamp: log.created_at,
            type: log.action.toLowerCase(),
            description: `${log.action} on ${log.entity_name} (${log.entity_id})`,
            userName: 'System User',
            userRole: 'staff',
            items: log.changes?.delta ? [{ componentName: log.entity_name, qtyDiff: log.changes.delta }] : [],
            diffs: log.changes?.before ? [{ field: 'state', oldValue: JSON.stringify(log.changes.before), newValue: JSON.stringify(log.changes.after) }] : []
          }));
          setDbAuditLogs(mappedLogs);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const combinedTransactions = [...dbAuditLogs, ...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredTransactions = combinedTransactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.kitName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedType === 'all') return matchesSearch;
    if (selectedType === 'items') return matchesSearch && tx.items.length > 0;
    if (selectedType === 'kits') return matchesSearch && (tx.kitName || tx.description.toLowerCase().includes('kit'));
    if (selectedType === 'vendors') return matchesSearch && tx.description.toLowerCase().includes('vendor');
    if (selectedType === 'customers') return matchesSearch && tx.description.toLowerCase().includes('customer');
    if (selectedType === 'orders') return matchesSearch && (tx.description.toLowerCase().includes('order') || tx.description.includes('PO-') || tx.description.includes('SO-'));
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <GitCommit className="w-3 h-3" /> GitHub-Style Commit Stream
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            System Revision History & Audit Trail
          </h2>
          <p className="text-xs text-slate-300 max-w-xl font-medium mt-1">
            Granular activity log tracking property diffs, kit formulations, and transaction changes with system-wide Undo/Redo capability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-2 text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Recorded Revisions</div>
            <div className="text-xl font-black text-indigo-400 font-mono">{transactions.length}</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search commits, descriptions, diffs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'items', label: 'Components' },
            { id: 'kits', label: 'Composite Kits' },
            { id: 'orders', label: 'Orders (PO/SO)' },
            { id: 'vendors', label: 'Vendors' },
            { id: 'customers', label: 'Customers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedType === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Commit / Revision Timeline */}
      <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx) => (
            <div key={tx.id} className="relative group">
              {/* Timeline Marker */}
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      tx.type === 'pack' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      tx.type === 'unpack' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      {tx.type}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800">{tx.description}</h4>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 font-sans flex items-center gap-1.5">
                      <User className="w-3 h-3 text-indigo-600" />
                      {tx.userName || 'Guest Administrator'}
                      <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-indigo-100 text-indigo-800 font-extrabold">{tx.userRole || 'admin'}</span>
                    </span>
                    <span>{new Date(tx.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* Diff Viewer Section */}
                {tx.diffs && tx.diffs.length > 0 && (
                  <div className="mb-3 space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Property Revisions ({tx.diffs.length} changed)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tx.diffs.map((diff, idx) => {
                        let fieldName = diff.field;
                        let oldV = diff.oldValue;
                        let newV = diff.newValue;
                        if (fieldName === 'added_component' && newV) {
                          const part = inventory.find(i => i.id === newV);
                          fieldName = 'Added Component';
                          newV = part ? part.name : newV;
                        } else if (fieldName === 'removed_component' && oldV) {
                          const part = inventory.find(i => i.id === oldV);
                          fieldName = 'Removed Component';
                          oldV = part ? part.name : oldV;
                        } else if (fieldName.startsWith('qty_')) {
                          const partId = fieldName.replace('qty_', '');
                          const part = inventory.find(i => i.id === partId);
                          fieldName = `Quantity of ${part ? part.name : partId}`;
                        }
                        return (
                          <DiffViewer
                            key={idx}
                            label={fieldName}
                            oldValue={oldV}
                            newValue={newV}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Item Movement Lines */}
                {tx.items && tx.items.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Inventory Qty Adjustments
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tx.items.map((line, lIdx) => (
                        <div key={lIdx} className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-2">
                          <span className="font-medium text-slate-700">{line.componentName}</span>
                          <span className={`font-mono font-bold ${line.qtyDiff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {line.qtyDiff > 0 ? `+${line.qtyDiff}` : line.qtyDiff}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <History className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600">No revisions matched your criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search filters or performing updates in the catalog.</p>
          </div>
        )}
      </div>
    </div>
  );
}
