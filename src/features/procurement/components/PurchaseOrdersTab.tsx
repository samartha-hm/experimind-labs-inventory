import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  DollarSign,
  Building2,
  Calendar,
  LayoutGrid,
  List,
  ChevronRight,
  Package,
  Edit2,
  Trash2,
  X,
  Eye,
} from 'lucide-react';

import DocumentPreviewModal from '@/src/shared/components/DocumentPreviewModal';
import PODocumentGeneratorModal from '@/src/features/procurement/components/PODocumentGeneratorModal';
import { useData } from '@/src/DataContext';
import { useApproval } from '@/src/contexts/ApprovalContext';

interface PurchaseOrdersTabProps {
  role: string | null;
}

export default function PurchaseOrdersTab({ role }: PurchaseOrdersTabProps) {
  const {
    purchaseOrders: orders,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPoForPreview, setSelectedPoForPreview] = useState<any | null>(null);
  const [editingPo, setEditingPo] = useState<any | null>(null);

  const { createApprovalRequest, thresholds } = useApproval();

  const [newPo, setNewPo] = useState({
    vendorName: '',
    expectedDate: '',
    totalAmount: '',
    status: 'draft',
  });

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPo.vendorName) return;

    const amount = parseFloat(newPo.totalAmount) || 2500.0;
    const poNumber = `PO-2026-0${orders.length + 100}`;
    const requiresApproval = amount >= thresholds.poTier1Threshold;

    const po = {
      poNumber,
      vendorName: newPo.vendorName,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: newPo.expectedDate || '2026-08-10',
      status: requiresApproval ? 'pending_approval' : (newPo.status || 'draft'),
      totalAmount: amount,
      itemCount: 5,
    };

    const newId = await addPurchaseOrder(po);

    if (requiresApproval) {
      await createApprovalRequest({
        type: 'purchase_order',
        targetId: poNumber,
        title: `Procurement PO for ${newPo.vendorName} (Amount: ₹${amount.toLocaleString()})`,
        submittedBy: { id: 'usr_staff', name: 'Procurement Specialist', role: 'Staff' },
        requiredTier: amount >= thresholds.poTier2Threshold ? 'tier2_finance_admin' : 'tier1_procurement',
        amount: amount,
        payload: po,
        diffs: [
          { field: 'Purchase Order Total', oldValue: '₹0 (New PO)', newValue: `₹${amount.toLocaleString()}` },
          { field: 'Vendor', oldValue: 'None', newValue: newPo.vendorName }
        ]
      });
    }

    setIsCreateModalOpen(false);
    setNewPo({ vendorName: '', expectedDate: '', totalAmount: '', status: 'draft' });
  };

  const handleEditSavePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPo) return;

    await updatePurchaseOrder(editingPo.id, editingPo);
    setEditingPo(null);
  };

  const handleDeletePo = async (id: string) => {
    if (confirm('Are you sure you want to delete this purchase order?')) {
      await deletePurchaseOrder(id);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-indigo-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100/80">
              <ShoppingCart className="w-5 h-5" />
            </div>
            Purchase Orders & Procurement
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Issue, update, and manage component replenishment orders with full owner control.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <div className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['all', 'draft', 'approved', 'received'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st} Orders
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO number or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Grid or Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((po) => (
            <div
              key={po.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-xl transition-all space-y-4 relative group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 font-mono tracking-wider">{po.poNumber}</span>
                  <h3 className="font-extrabold text-slate-900 text-base">{po.vendorName}</h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedPoForPreview(po)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                    title="Preview Printable Commercial Invoice"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingPo(po)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                    title="Edit Order"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePo(po.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete Order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 font-medium">
                <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Issued: {po.orderDate}</p>
                <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-slate-400" /> Expected: {po.expectedDate}</p>
                <p className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-slate-400" /> {po.itemCount} line items</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-base font-black text-slate-900 font-mono">₹{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  po.status === 'received' ? 'bg-emerald-100 text-emerald-800' : po.status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {po.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">PO Number</th>
                <th className="p-4">Vendor</th>
                <th className="p-4">Issued</th>
                <th className="p-4">Expected</th>
                <th className="p-4">Status</th>
                <th className="p-4">Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-mono font-bold text-indigo-600">{po.poNumber}</td>
                  <td className="p-4 font-bold text-slate-900">{po.vendorName}</td>
                  <td className="p-4 text-slate-600">{po.orderDate}</td>
                  <td className="p-4 text-slate-600">{po.expectedDate}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {po.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-900">₹{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => setSelectedPoForPreview(po)} className="p-1 text-slate-400 hover:text-indigo-600">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingPo(po)} className="p-1 text-slate-400 hover:text-indigo-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeletePo(po.id)} className="p-1 text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Commercial Document Preview Modal */}
      {selectedPoForPreview && (
        <DocumentPreviewModal
          isOpen={Boolean(selectedPoForPreview)}
          onClose={() => setSelectedPoForPreview(null)}
          documentType="purchase_order"
          data={{
            orderNumber: selectedPoForPreview.poNumber,
            partnerName: selectedPoForPreview.vendorName,
            date: selectedPoForPreview.orderDate,
            dueDateOrExpected: selectedPoForPreview.expectedDate,
            status: selectedPoForPreview.status,
            totalAmount: selectedPoForPreview.totalAmount,
            items: [
              { name: 'OpAmp LM393 Logic IC Controller', qty: 200, unitPrice: 3.50, total: 700.00 },
              { name: 'IR Signal Detector Sensor Board', qty: 50, unitPrice: 8.20, total: 410.00 },
              { name: 'High-Temp Solder Wire (Roll)', qty: 10, unitPrice: 15.00, total: 150.00 },
            ],
          }}
        />
      )}

      {/* Edit PO Modal */}
      {editingPo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Purchase Order {editingPo.poNumber}</h3>
              <button onClick={() => setEditingPo(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSavePo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={editingPo.vendorName}
                  onChange={(e) => setEditingPo({ ...editingPo, vendorName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Status</label>
                  <select
                    value={editingPo.status}
                    onChange={(e) => setEditingPo({ ...editingPo, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="received">Received</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Expected Date</label>
                  <input
                    type="date"
                    value={editingPo.expectedDate || ''}
                    onChange={(e) => setEditingPo({ ...editingPo, expectedDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Total Amount (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPo.totalAmount}
                    onChange={(e) => setEditingPo({ ...editingPo, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPo(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Update Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Issue Purchase Order</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Vendor / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Semiconductor Supplies"
                  value={newPo.vendorName}
                  onChange={(e) => setNewPo({ ...newPo, vendorName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Expected Date</label>
                  <input
                    type="date"
                    value={newPo.expectedDate}
                    onChange={(e) => setNewPo({ ...newPo, expectedDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Total Amount (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="2500.00"
                    value={newPo.totalAmount}
                    onChange={(e) => setNewPo({ ...newPo, totalAmount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Issue PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Printable PDF Invoice Generator Modal */}
      {selectedPoForPreview && (
        <PODocumentGeneratorModal
          po={selectedPoForPreview}
          isOpen={!!selectedPoForPreview}
          onClose={() => setSelectedPoForPreview(null)}
        />
      )}
    </div>
  );
}
