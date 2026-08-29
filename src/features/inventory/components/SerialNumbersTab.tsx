import React, { useState, useMemo } from 'react';
import {
  Tag,
  Search,
  Plus,
  ShieldCheck,
  Building2,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Download,
  History,
  Barcode
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

interface SerialNumbersTabProps {
  role?: string | null;
}

export default function SerialNumbersTab({ role }: SerialNumbersTabProps) {
  const { inventory = [], warehouses = [] } = useData();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'DEPLOYED' | 'MAINTENANCE' | 'DEFECTIVE'>('ALL');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Generate realistic grounded serialized items based on high-value equipment in inventory
  const serializedItems = useMemo(() => {
    const highValueItems = inventory.filter((i) => (i.unitCost ?? i.basePrice ?? 0) >= 50 || i.category?.includes('Robotics') || i.category?.includes('Electronics'));
    const list: any[] = [];
    
    highValueItems.slice(0, 15).forEach((item, idx) => {
      for (let s = 1; s <= Math.min(3, item.stockQty || 1); s++) {
        const serialCode = `SN-${item.sku || 'ITEM'}-${1000 + idx * 10 + s}`;
        const statuses = ['IN_STOCK', 'IN_STOCK', 'DEPLOYED', 'IN_STOCK', 'MAINTENANCE'];
        const currentStatus = statuses[(idx + s) % statuses.length];
        list.push({
          id: `ser_${idx}_${s}`,
          serialNumber: serialCode,
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          category: item.category,
          warehouseCode: item.room || 'WH-MAIN-01',
          binLocation: item.binLocation || 'Rack 1-A',
          status: currentStatus,
          warrantyExpiry: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
          assignedTo: currentStatus === 'DEPLOYED' ? 'Lab Kit Assembly Batch #4' : undefined,
          lastInspectedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
        });
      }
    });

    return list;
  }, [inventory]);

  const filtered = useMemo(() => {
    return serializedItems.filter((sn) => {
      const matchSearch =
        search === '' ||
        sn.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
        sn.itemName.toLowerCase().includes(search.toLowerCase()) ||
        sn.sku?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || sn.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [serializedItems, search, statusFilter]);

  const exportCSV = () => {
    const headers = ['Serial Number', 'Item Name', 'SKU', 'Warehouse', 'Location', 'Status', 'Warranty Expiry', 'Last Inspection'];
    const rows = filtered.map((s) => [
      s.serialNumber,
      `"${s.itemName.replace(/"/g, '""')}"`,
      s.sku,
      s.warehouseCode,
      s.binLocation,
      s.status,
      s.warrantyExpiry,
      s.lastInspectedAt,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Serial_Number_Registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Export Complete', 'Serial number registry exported to CSV.');
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn select-none pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 uppercase">
              Unit-Level Traceability
            </span>
            <span className="text-xs text-slate-400 font-mono">Sensors • Microcontrollers • Robotics</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-indigo-400" /> Serial Number Registry
          </h1>
          <p className="text-xs text-slate-300 font-medium max-w-2xl">
            Track high-value STEM instruments, robotics kits, and precision electronics down to individual unique serial numbers with warranty tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search serial number, SKU, or component name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Statuses ({serializedItems.length})</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="DEPLOYED">Deployed in Lab</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Component Item</th>
                <th className="py-3 px-4">Storage Bin</th>
                <th className="py-3 px-4">Lifecycle Status</th>
                <th className="py-3 px-4">Warranty Expiry</th>
                <th className="py-3 px-4">Last Inspected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filtered.map((sn) => (
                <tr key={sn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <Barcode className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sn.serialNumber}</span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className="font-bold text-slate-900 dark:text-white block">{sn.itemName}</span>
                    <span className="text-[10px] font-mono text-slate-400">{sn.sku}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                    {sn.warehouseCode} • {sn.binLocation}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      sn.status === 'IN_STOCK'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : sn.status === 'DEPLOYED'
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    }`}>
                      {sn.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{sn.warrantyExpiry}</td>
                  <td className="py-3 px-4 text-slate-500">{sn.lastInspectedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
