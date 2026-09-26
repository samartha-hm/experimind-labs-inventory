import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  PackageCheck,
} from 'lucide-react';

import DocumentPreviewModal from '@/src/shared/components/DocumentPreviewModal';
import PODocumentGeneratorModal from '@/src/features/procurement/components/PODocumentGeneratorModal';
import SmartSelect from '@/src/shared/components/SmartSelect';
import POReceivingModal from '@/src/features/procurement/components/POReceivingModal';
import { useData } from '@/src/DataContext';
import { useApproval } from '@/src/contexts/ApprovalContext';
import { useAuth } from '@/src/AuthContext';
import { summarizeReplenishmentOrder } from '@/src/features/procurement/replenishmentStatus';
import {
  computePoTotal,
  generatePoNumber,
  resolvePoApproval,
  validatePoDraft,
  type POLineItemDraft,
} from '@/src/features/procurement/poCreation';

interface PurchaseOrdersTabProps {
  role: string | null;
}

export default function PurchaseOrdersTab({ role }: PurchaseOrdersTabProps) {
  const {
    purchaseOrders: orders,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    inventory,
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPoForPreview, setSelectedPoForPreview] = useState<any | null>(null);
  const [editingPo, setEditingPo] = useState<any | null>(null);
  const [receivingPo, setReceivingPo] = useState<any | null>(null);

  const { createApprovalRequest, approveRequest, rejectRequest, requests, thresholds } = useApproval();
  const { user } = useAuth();

  const emptyPoDraft = { vendorName: '', expectedDate: '', lineItems: [] as POLineItemDraft[] };
  const [newPo, setNewPo] = useState(emptyPoDraft);
  const [poFormErrors, setPoFormErrors] = useState<string[]>([]);

  const addPoLine = () =>
    setNewPo((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { itemId: '', name: '', quantity: 1, unitPrice: 0 }],
    }));

  const updatePoLine = (index: number, patch: Partial<POLineItemDraft>) =>
    setNewPo((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));

  const removePoLine = (index: number) =>
    setNewPo((prev) => ({ ...prev, lineItems: prev.lineItems.filter((_, i) => i !== index) }));

  const selectPoItem = (index: number, itemId: string) => {
    const item = inventory.find((i) => i.id === itemId);
    updatePoLine(index, {
      itemId,
      name: item?.name ?? '',
      unitPrice: item?.unitCost ?? item?.basePrice ?? 0,
    });
  };

  const newPoTotal = computePoTotal(newPo.lineItems);

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validatePoDraft({
      vendorName: newPo.vendorName,
      expectedDate: newPo.expectedDate,
      lineItems: newPo.lineItems,
    });
    if (errors.length > 0) {
      setPoFormErrors(errors);
      return;
    }

    const total = computePoTotal(newPo.lineItems);
    const poNumber = generatePoNumber(orders.map((o) => o.poNumber ?? ''));
    const approval = resolvePoApproval(total, thresholds);

    const po = {
      poNumber,
      vendorName: newPo.vendorName,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: newPo.expectedDate,
      status: approval.requiresApproval ? 'pending_approval' : 'draft',
      totalAmount: total,
      itemCount: newPo.lineItems.length,
      items: newPo.lineItems,
    };

    await addPurchaseOrder(po);

    if (approval.requiresApproval && approval.requiredTier && user) {
      await createApprovalRequest({
        type: 'purchase_order',
        targetId: poNumber,
        title: `Purchase order ${poNumber} for ${newPo.vendorName} (₹${total.toLocaleString('en-IN')})`,
        submittedBy: { id: user.id, name: user.name, role: user.role },
        requiredTier: approval.requiredTier,
        amount: total,
        payload: po,
        diffs: [
          { field: 'Purchase Order Total', oldValue: '₹0 (New PO)', newValue: `₹${total.toLocaleString('en-IN')}` },
          { field: 'Vendor', oldValue: 'None', newValue: newPo.vendorName },
          { field: 'Line Items', oldValue: '0', newValue: String(newPo.lineItems.length) },
        ],
      });
    }

    setIsCreateModalOpen(false);
    setNewPo(emptyPoDraft);
    setPoFormErrors([]);
  };

  const pendingRequestForPo = (po: any) =>
    requests.find(
      (r) => r.type === 'purchase_order' && r.targetId === po.poNumber && r.status === 'PENDING',
    );

  const canReviewPos = role === 'admin';

  const handleApprovePo = async (po: any) => {
    const request = pendingRequestForPo(po);
    if (!request) return;
    await approveRequest(request.id);
    await updatePurchaseOrder(po.id, { status: 'issued' });
  };

  const handleRejectPo = async (po: any) => {
    const request = pendingRequestForPo(po);
    if (!request) return;
    const reason = window.prompt(`Reason for rejecting ${po.poNumber}:`, '');
    if (reason === null) return;
    await rejectRequest(request.id, reason.trim() || 'Rejected by reviewer');
    await updatePurchaseOrder(po.id, { status: 'cancelled' });
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
    const matchesStatus = statusFilter === 'all' || summarizeReplenishmentOrder(o).status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getSummary = (po: any) => summarizeReplenishmentOrder(po);
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending approval',
    ordered: 'Ordered',
    in_transit: 'In transit',
    partially_received: 'Partial',
    backordered: 'Backordered',
    received: 'Received',
    cancelled: 'Cancelled',
  };
  const receivableStatuses = new Set(['ordered', 'in_transit', 'partially_received', 'backordered']);

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
          {['all', 'draft', 'pending_approval', 'ordered', 'in_transit', 'partially_received', 'backordered', 'received'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'All' : statusLabels[st]}
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
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
                    title="Preview Purchase Order Document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingPo(po)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
                    title="Edit Order"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePo(po.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
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
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const summary = getSummary(po);
                    const statusClass = summary.status === 'received'
                      ? 'bg-emerald-100 text-emerald-800'
                      : summary.status === 'backordered'
                        ? 'bg-rose-100 text-rose-800'
                        : summary.status === 'partially_received'
                          ? 'bg-amber-100 text-amber-800'
                          : summary.status === 'pending_approval'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-600';

                    return (
                      <>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {summary.receivedQty}/{summary.orderedQty} received
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusClass}`}>
                          {statusLabels[summary.status]}
                        </span>
                        {canReviewPos && summary.status === 'pending_approval' && pendingRequestForPo(po) && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprovePo(po);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Approve and issue this purchase order"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectPo(po);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Reject this purchase order"
                            >
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                        {receivableStatuses.has(summary.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReceivingPo(po);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Receive Goods"
                          >
                            <PackageCheck className="w-3 h-3" /> Receive
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs table-responsive">
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
                    {(() => {
                      const summary = getSummary(po);
                      const badgeClass = summary.status === 'pending_approval'
                        ? 'bg-indigo-100 text-indigo-800'
                        : summary.status === 'received'
                          ? 'bg-emerald-100 text-emerald-800'
                          : summary.status === 'backordered'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700';
                      return (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeClass}`}>
                          {statusLabels[summary.status]} · {summary.receivedQty}/{summary.orderedQty}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-900">₹{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                    {(() => {
                      const summary = getSummary(po);
                      return (
                        <>
                          {canReviewPos && summary.status === 'pending_approval' && pendingRequestForPo(po) && (
                            <>
                              <button
                                onClick={() => handleApprovePo(po)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Approve and issue this purchase order"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectPo(po)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Reject this purchase order"
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                          {receivableStatuses.has(summary.status) && (
                            <button
                              onClick={() => setReceivingPo(po)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <PackageCheck className="w-3 h-3" /> Receive
                            </button>
                          )}
                        </>
                      );
                    })()}
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

      {/* PO Inbound Dock Receiving Modal */}
      {receivingPo && (
        <POReceivingModal
          isOpen={Boolean(receivingPo)}
          onClose={() => setReceivingPo(null)}
          purchaseOrder={receivingPo}
        />
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
            items: (selectedPoForPreview.items || []).map((item: any) => ({
              name: item.name,
              qty: item.quantity,
              unitPrice: item.unitPrice,
              total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
            })),
          }}
        />
      )}

      {/* Edit PO Modal */}
      {editingPo && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Purchase Order {editingPo.poNumber}</h3>
              <button onClick={() => setEditingPo(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Status</label>
                  <SmartSelect
                    value={editingPo.status}
                    onChange={(val) => setEditingPo({ ...editingPo, status: val })}
                    options={[
                      { value: 'draft', label: 'Draft', badge: 'Draft' },
                      { value: 'issued', label: 'Issued', badge: 'Issued' },
                      { value: 'received', label: 'Received', badge: 'Received' },
                      { value: 'cancelled', label: 'Cancelled', badge: 'Cancelled' },
                    ]}
                    size="sm"
                    placeholder="Status"
                    aria-label="PO Status"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Expected Date</label>
                  <input
                    type="date"
                    value={editingPo.expectedDate || ''}
                    onChange={(e) => setEditingPo({ ...editingPo, expectedDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Total Amount (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPo.totalAmount}
                    onChange={(e) => setEditingPo({ ...editingPo, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPo(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Update Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Create PO Modal */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Purchase Order</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-3 text-xs">
              {poFormErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1">
                  {poFormErrors.map((error) => (
                    <p key={error} className="text-rose-700 font-bold flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5 shrink-0" /> {error}
                    </p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Vendor / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Semiconductor Supplies"
                    value={newPo.vendorName}
                    onChange={(e) => setNewPo({ ...newPo, vendorName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Expected Date *</label>
                  <input
                    type="date"
                    required
                    value={newPo.expectedDate}
                    onChange={(e) => setNewPo({ ...newPo, expectedDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-500 uppercase text-[10px]">Line Items *</label>
                  <button
                    type="button"
                    onClick={addPoLine}
                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                {newPo.lineItems.length === 0 && (
                  <p className="text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                    No line items yet. Add at least one item from inventory.
                  </p>
                )}

                <div className="space-y-2">
                  {newPo.lineItems.map((line, index) => (
                    <div key={index} className="grid grid-cols-[1fr_70px_90px_90px_28px] gap-2 items-center">
                      <SmartSelect
                        value={line.itemId}
                        onChange={(val) => selectPoItem(index, val)}
                        options={inventory
                          .filter((item) => !item.isHidden)
                          .map((item) => ({ value: item.id, label: item.name }))}
                        size="sm"
                        placeholder="Select inventory item"
                        aria-label={`Line item ${index + 1}`}
                      />
                      <input
                        type="number"
                        min={1}
                        step="1"
                        placeholder="Qty"
                        value={line.quantity || ''}
                        onChange={(e) => updatePoLine(index, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 font-mono focus:outline-none text-slate-900 dark:text-white"
                        aria-label={`Quantity for line item ${index + 1}`}
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Unit ₹"
                        value={line.unitPrice || ''}
                        onChange={(e) => updatePoLine(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 font-mono focus:outline-none text-slate-900 dark:text-white"
                        aria-label={`Unit price for line item ${index + 1}`}
                      />
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-center">
                        ₹{(line.quantity * line.unitPrice).toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePoLine(index)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="Remove line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Total</span>
                <span className="font-mono font-black text-slate-900 dark:text-white">
                  ₹{newPoTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {newPoTotal >= thresholds.poTier1Threshold && (
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  This order requires approval before it can be issued
                  {newPoTotal >= thresholds.poTier2Threshold ? ' (finance review)' : ''}.
                </p>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {newPoTotal >= thresholds.poTier1Threshold ? 'Submit for Approval' : 'Create PO'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
