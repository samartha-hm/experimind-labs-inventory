import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PackageCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  UserCheck,
  DollarSign,
  LayoutGrid,
  List,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  X,
  Eye,
} from 'lucide-react';

import DocumentPreviewModal from '@/src/shared/components/DocumentPreviewModal';
import SOFulfillmentModal from '@/src/features/sales/components/SOFulfillmentModal';
import { useData } from '@/src/DataContext';

interface SalesOrdersTabProps {
  role: string | null;
}

export default function SalesOrdersTab({ role }: SalesOrdersTabProps) {
  const {
    salesOrders: orders,
    addSalesOrder,
    updateSalesOrder,
    deleteSalesOrder,
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSoForPreview, setSelectedSoForPreview] = useState<any | null>(null);

  // Edit SO Modal state & Fulfillment Modal state
  const [editingSo, setEditingSo] = useState<any | null>(null);
  const [fulfillingSo, setFulfillingSo] = useState<any | null>(null);

  const [newSo, setNewSo] = useState({
    customerName: '',
    customerEmail: '',
    phone: '',
    address: '',
    purpose: '',
    requiredDate: '',
    totalAmount: '',
    status: 'draft',
  });

  const handleCreateSo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSo.customerName) return;

    const so = {
      soNumber: `SO-2026-40${orders.length + 10}`,
      customerName: newSo.customerName,
      customerEmail: newSo.customerEmail,
      phone: newSo.phone,
      address: newSo.address,
      purpose: newSo.purpose,
      orderDate: new Date().toISOString().split('T')[0],
      requiredDate: newSo.requiredDate || '2026-08-05',
      status: newSo.status || 'draft',
      totalAmount: parseFloat(newSo.totalAmount) || 1200.0,
      itemCount: 4,
    };

    await addSalesOrder(so);
    setIsCreateModalOpen(false);
    setNewSo({ customerName: '', customerEmail: '', phone: '', address: '', purpose: '', requiredDate: '', totalAmount: '', status: 'draft' });
  };

  const handleEditSaveSo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSo) return;

    await updateSalesOrder(editingSo.id, editingSo);
    setEditingSo(null);
  };

  const handleDeleteSo = async (id: string) => {
    if (confirm('Are you sure you want to delete this sales order?')) {
      await deleteSalesOrder(id);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.soNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-indigo-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100/80">
              <PackageCheck className="w-5 h-5" />
            </div>
            Sales Orders & B2B Fulfillment
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Issue, edit, and track customer shipments and commercial invoices with full owner control.
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
            <span>Create Sales Order</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['all', 'draft', 'picking', 'shipped', 'delivered'].map((st) => (
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
            placeholder="Search SO number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Grid or Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((so) => (
            <div
              key={so.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-xl transition-all space-y-4 relative group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 font-mono tracking-wider">{so.soNumber}</span>
                  <h3 className="font-extrabold text-slate-900 text-base">{so.customerName}</h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedSoForPreview(so)}
                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer"
                    title="Preview Printable Invoice"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingSo(so)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                    title="Edit Sales Order"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSo(so.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete Sales Order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 font-medium">
                <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Order Date: {so.orderDate}</p>
                <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-slate-400" /> Required: {so.requiredDate}</p>
                <p className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-slate-400" /> {so.itemCount} items ordered</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-base font-black text-slate-900 font-mono">₹{so.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    so.status === 'shipped' || so.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {so.status}
                  </span>
                  {so.status !== 'shipped' && so.status !== 'completed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFulfillingSo(so);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Pick & Dispatch Order"
                    >
                      <Truck className="w-3 h-3" /> Fulfill
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">SO Number</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Order Date</th>
                <th className="p-4">Required</th>
                <th className="p-4">Status</th>
                <th className="p-4">Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((so) => (
                <tr key={so.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-mono font-bold text-purple-600">{so.soNumber}</td>
                  <td className="p-4 font-bold text-slate-900">{so.customerName}</td>
                  <td className="p-4 text-slate-600">{so.orderDate}</td>
                  <td className="p-4 text-slate-600">{so.requiredDate}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {so.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-900">₹{so.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                    {so.status !== 'shipped' && so.status !== 'completed' && (
                      <button
                        onClick={() => setFulfillingSo(so)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Truck className="w-3 h-3" /> Fulfill
                      </button>
                    )}
                    <button onClick={() => setSelectedSoForPreview(so)} className="p-1 text-slate-400 hover:text-purple-600">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingSo(so)} className="p-1 text-slate-400 hover:text-indigo-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteSo(so.id)} className="p-1 text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SO Outbound Fulfillment Modal */}
      {fulfillingSo && (
        <SOFulfillmentModal
          isOpen={Boolean(fulfillingSo)}
          onClose={() => setFulfillingSo(null)}
          salesOrder={fulfillingSo}
        />
      )}

      {/* Commercial Invoice Document Preview Modal */}
      {selectedSoForPreview && (
        <DocumentPreviewModal
          isOpen={Boolean(selectedSoForPreview)}
          onClose={() => setSelectedSoForPreview(null)}
          documentType="invoice"
          data={{
            orderNumber: selectedSoForPreview.soNumber,
            partnerName: selectedSoForPreview.customerName,
            date: selectedSoForPreview.orderDate,
            dueDateOrExpected: selectedSoForPreview.requiredDate,
            status: selectedSoForPreview.status,
            totalAmount: selectedSoForPreview.totalAmount,
            items: [
              { name: 'Prastuti Science Experiment Kit Set', qty: 10, unitPrice: 150.00, total: 1500.00 },
              { name: 'Electronics Innovation Starter Bundle', qty: 5, unitPrice: 390.00, total: 1950.00 },
            ],
          }}
        />
      )}

      {/* Edit SO Modal */}
      {editingSo && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Sales Order {editingSo.soNumber}</h3>
              <button onClick={() => setEditingSo(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSaveSo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={editingSo.customerName}
                  onChange={(e) => setEditingSo({ ...editingSo, customerName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Email</label>
                  <input
                    type="email"
                    value={editingSo.customerEmail || ''}
                    onChange={(e) => setEditingSo({ ...editingSo, customerEmail: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingSo.phone || ''}
                    onChange={(e) => setEditingSo({ ...editingSo, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Address</label>
                <input
                  type="text"
                  value={editingSo.address || ''}
                  onChange={(e) => setEditingSo({ ...editingSo, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Purpose / Notes</label>
                <input
                  type="text"
                  value={editingSo.purpose || ''}
                  onChange={(e) => setEditingSo({ ...editingSo, purpose: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Status</label>
                  <select
                    value={editingSo.status}
                    onChange={(e) => setEditingSo({ ...editingSo, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="picking">Picking</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Total Amount (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingSo.totalAmount}
                    onChange={(e) => setEditingSo({ ...editingSo, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSo(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Update Sales Order
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Create SO Modal */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Sales Order</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Customer / School Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex High School Robotics Club"
                  value={newSo.customerName}
                  onChange={(e) => setNewSo({ ...newSo, customerName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Email</label>
                  <input
                    type="email"
                    value={newSo.customerEmail}
                    onChange={(e) => setNewSo({ ...newSo, customerEmail: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Phone</label>
                  <input
                    type="text"
                    value={newSo.phone}
                    onChange={(e) => setNewSo({ ...newSo, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Address</label>
                <input
                  type="text"
                  value={newSo.address}
                  onChange={(e) => setNewSo({ ...newSo, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Purpose / Notes</label>
                <input
                  type="text"
                  value={newSo.purpose}
                  onChange={(e) => setNewSo({ ...newSo, purpose: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Required Date</label>
                  <input
                    type="date"
                    value={newSo.requiredDate}
                    onChange={(e) => setNewSo({ ...newSo, requiredDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Total Amount (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1200.00"
                    value={newSo.totalAmount}
                    onChange={(e) => setNewSo({ ...newSo, totalAmount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

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
                  Create Sales Order
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
