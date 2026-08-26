import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRightLeft,
  Building2,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Plus,
  Search,
  MapPin,
  ShieldCheck,
  AlertCircle,
  X,
  Send,
  PackageCheck
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

export default function StockTransferTab() {
  const { wmsTransfers, createWmsTransfer, dispatchWmsTransfer, receiveWmsTransfer, inventory, warehouses } = useData();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Transfer Form State
  const [sourceWarehouse, setSourceWarehouse] = useState(warehouses[0]?.code || 'WH-MAIN-01');
  const [sourceBin, setSourceBin] = useState('Storage Bay 1');
  const [destWarehouse, setDestWarehouse] = useState(warehouses[1]?.code || 'WH-LAB-02');
  const [destBin, setDestBin] = useState('Storage Bay 2');
  const [selectedItemId, setSelectedItemId] = useState(inventory[0]?.id || '');
  const [transferQty, setTransferQty] = useState('5');
  const [transferNotes, setTransferNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispatch / Receive modal state
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [carrier, setCarrier] = useState('Internal Van #KA-20-EX-1029');
  const [trackingNumber, setTrackingNumber] = useState('');

  const filteredTransfers = useMemo(() => {
    return wmsTransfers.filter((t) => {
      const matchSearch =
        t.transfer_number.toLowerCase().includes(search.toLowerCase()) ||
        t.source_warehouse_code.toLowerCase().includes(search.toLowerCase()) ||
        t.destination_warehouse_code.toLowerCase().includes(search.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(search.toLowerCase())) ||
        (t.lines || []).some(l => l.item_name.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [wmsTransfers, search, statusFilter]);

  const handleCreateTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find((i) => i.id === selectedItemId);
    if (!item) {
      alert('Please select an inventory component to transfer.');
      return;
    }

    const qty = parseInt(transferQty, 10);
    if (isNaN(qty) || qty <= 0) {
      alert('Please provide a valid transfer quantity.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createWmsTransfer({
        sourceWarehouse,
        sourceBin: sourceBin || item.binLocation || 'Storage Bay 1',
        destinationWarehouse: destWarehouse,
        destinationBin: destBin || 'Storage Bay 2',
        notes: transferNotes || `Transfer ${item.name} from ${sourceWarehouse} to ${destWarehouse}`,
        lines: [
          {
            itemId: item.id,
            itemName: item.name,
            itemSku: item.barcode || item.id,
            requestedQty: qty,
            sourceBin: sourceBin || item.binLocation || 'Storage Bay 1',
            destinationBin: destBin || 'Storage Bay 2',
          },
        ],
      });

      showToast('success', 'Transfer Manifest Created', `Initiated transfer order for ${qty}x ${item.name}`);
      setIsModalOpen(false);
      setTransferNotes('');
    } catch (e: any) {
      showToast('error', 'Transfer Failed', e.message || 'Error creating stock transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (transferId: string) => {
    try {
      await dispatchWmsTransfer(transferId, carrier, trackingNumber || `TRK-${Date.now().toString().slice(-6)}`);
      showToast('success', 'Dispatched to Transit', 'Deducted from source bin and logged TRANSFER_OUT in Stock Ledger');
      setDispatchingId(null);
    } catch (e: any) {
      showToast('error', 'Dispatch Error', e.message || 'Failed to dispatch');
    }
  };

  const handleReceive = async (transferId: string) => {
    try {
      await receiveWmsTransfer(transferId);
      showToast('success', 'Transfer Received & Slotted', 'Added to destination bin and logged TRANSFER_IN in Stock Ledger');
    } catch (e: any) {
      showToast('error', 'Receiving Error', e.message || 'Failed to receive');
    }
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/30 uppercase flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3 text-indigo-400" /> MULTI-STAGE LOGISTICS PIPELINE
            </span>
            <span className="text-slate-400 text-xs">• Inter-Warehouse & Inter-Bay Transfers</span>
          </div>
          <h2 className="text-2xl font-black text-white">Stock Transfers & Relocation Manifest</h2>
          <p className="text-xs text-slate-300">
            Create transfer orders, dispatch with carrier tracking, and confirm receiving with immutable stock ledger posting.
          </p>
        </div>

        <button
          onClick={() => {
            if (inventory.length > 0) setSelectedItemId(inventory[0].id);
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Transfer Order</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transfer number, warehouse, part..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Statuses ({wmsTransfers.length})</option>
            <option value="draft">Draft Manifests</option>
            <option value="in_transit">In-Transit Shipments</option>
            <option value="received">Fully Received</option>
          </select>
        </div>
      </div>

      {/* Transfers Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTransfers.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <ArrowRightLeft className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm text-slate-500">No stock transfers found matching criteria.</p>
          </div>
        ) : (
          filteredTransfers.map((transfer) => {
            const line = transfer.lines?.[0];
            const isDraft = transfer.status === 'draft';
            const isInTransit = transfer.status === 'in_transit';
            const isReceived = transfer.status === 'received';

            return (
              <div
                key={transfer.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {transfer.transfer_number}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    isReceived
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : isInTransit
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {transfer.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-2">
                  <strong className="text-sm font-black text-slate-900 dark:text-white block">
                    {line ? `${line.requested_qty}x ${line.item_name}` : 'General Components'}
                  </strong>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Origin:</span>
                      <strong className="text-slate-900 dark:text-white">{transfer.source_warehouse_code} ({transfer.source_bin || 'Bay 1'})</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Destination:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">{transfer.destination_warehouse_code} ({transfer.destination_bin || 'Bay 2'})</strong>
                    </div>
                  </div>

                  {transfer.carrier && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      <span>{transfer.carrier} • {transfer.tracking_number || 'Internal'}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(transfer.created_at).toLocaleDateString('en-IN')}
                  </span>

                  <div className="flex items-center gap-2">
                    {isDraft && (
                      <button
                        onClick={() => setDispatchingId(transfer.id)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" /> Dispatch
                      </button>
                    )}

                    {isInTransit && (
                      <button
                        onClick={() => handleReceive(transfer.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <PackageCheck className="w-3.5 h-3.5" /> Receive Goods
                      </button>
                    )}

                    {isReceived && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Received
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE TRANSFER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white">Create Stock Transfer Manifest</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransferSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Component</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-medium"
                  required
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (On Hand: {item.stockQty} {item.unit} in {item.binLocation || 'Bay 1'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Source Warehouse</label>
                  <input
                    type="text"
                    value={sourceWarehouse}
                    onChange={(e) => setSourceWarehouse(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Source Bin Location</label>
                  <input
                    type="text"
                    value={sourceBin}
                    onChange={(e) => setSourceBin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Destination Warehouse</label>
                  <input
                    type="text"
                    value={destWarehouse}
                    onChange={(e) => setDestWarehouse(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Destination Putaway Bin</label>
                  <input
                    type="text"
                    value={destBin}
                    onChange={(e) => setDestBin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono font-bold text-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Transfer Reason / Courier Details</label>
                <input
                  type="text"
                  placeholder="e.g. Lab experiment replenishment..."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  Create Transfer Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH CONFIRMATION MODAL */}
      {dispatchingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="font-black text-base text-slate-900 dark:text-white">Dispatch Transfer Order</h3>
            <p className="text-xs text-slate-500">Attach transport details and release stock from source warehouse.</p>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Carrier / Vehicle</label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tracking Number</label>
                <input
                  type="text"
                  placeholder="e.g. TRK-987654"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setDispatchingId(null)}
                className="px-4 py-2 border rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDispatch(dispatchingId)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold cursor-pointer shadow-md"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
