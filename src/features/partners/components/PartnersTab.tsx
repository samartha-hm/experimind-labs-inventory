import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Building2,
  UserCheck,
  Plus,
  Mail,
  Phone,
  MapPin,
  Search,
  LayoutGrid,
  List,
  CreditCard,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useData } from '@/src/DataContext';

interface PartnersTabProps {
  role: string | null;
}

export default function PartnersTab({ role }: PartnersTabProps) {
  const {
    vendors,
    customers,
    addVendor,
    updateVendor,
    deleteVendor,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'vendors' | 'customers'>('vendors');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit Modal state
  const [editingPartner, setEditingPartner] = useState<any | null>(null);

  const [newPartner, setNewPartner] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    termsOrLimit: '',
    address: '',
  });

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.name) return;

    if (activeSubTab === 'vendors') {
      const v = {
        code: `VEND-00${vendors.length + 1}`,
        name: newPartner.name,
        contactName: newPartner.contactName || 'Primary Representative',
        email: newPartner.email || 'info@vendor.com',
        phone: newPartner.phone || '+1 (555) 000-0000',
        paymentTerms: newPartner.termsOrLimit || 'Net 30',
        address: newPartner.address || 'Enterprise HQ',
      };
      await addVendor(v);
    } else {
      const c = {
        code: `CUST-00${customers.length + 1}`,
        name: newPartner.name,
        contactName: newPartner.contactName || 'Account Manager',
        email: newPartner.email || 'billing@customer.com',
        phone: newPartner.phone || '+1 (555) 000-0000',
        creditLimit: parseFloat(newPartner.termsOrLimit) || 30000,
        address: newPartner.address || 'Client Address',
      };
      await addCustomer(c);
    }

    setIsAddModalOpen(false);
    setNewPartner({ name: '', contactName: '', email: '', phone: '', termsOrLimit: '', address: '' });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;

    if (activeSubTab === 'vendors') {
      await updateVendor(editingPartner.id, editingPartner);
    } else {
      await updateCustomer(editingPartner.id, editingPartner);
    }
    setEditingPartner(null);
  };

  const handleDeletePartner = async (id: string) => {
    if (confirm('Are you sure you want to delete this partner record?')) {
      if (activeSubTab === 'vendors') {
        await deleteVendor(id);
      } else {
        await deleteCustomer(id);
      }
    }
  };

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-indigo-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/80">
              <Users className="w-5 h-5" />
            </div>
            Partners & Directory Management
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage approved suppliers, component vendors, and corporate customers with full owner control.
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
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add {activeSubTab === 'vendors' ? 'Vendor' : 'Customer'}</span>
          </button>
        </div>
      </div>

      {/* Subtab navigation */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('vendors')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'vendors'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" /> Component Vendors ({vendors.length})
          </button>
          <button
            onClick={() => setActiveSubTab('customers')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'customers'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" /> B2B Customers ({customers.length})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeSubTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Display Cards or Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeSubTab === 'vendors' ? filteredVendors : filteredCustomers).map((item: any) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-xl transition-all space-y-4 relative group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-mono">
                    {item.code}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base">{item.name}</h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingPartner(item)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                    title="Edit Partner Record"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePartner(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete Partner Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <p className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-slate-400" /> {item.contactName}</p>
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {item.email}</p>
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {item.phone}</p>
                <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {item.address}</p>
              </div>

              {activeSubTab === 'vendors' && (
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium">On-Time Delivery Rate:</span>
                    <span className="font-mono font-bold text-emerald-600">98.4% ★★★★★</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium">Avg Lead Time:</span>
                    <span className="font-mono font-bold text-slate-800">4.2 Days</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">
                  {activeSubTab === 'vendors' ? 'Payment Terms' : 'Credit Limit'}
                </span>
                <span className="text-slate-900 font-mono">
                  {activeSubTab === 'vendors' ? item.paymentTerms : `$${item.creditLimit?.toLocaleString()}`}
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
                <th className="p-4">Code</th>
                <th className="p-4">Partner Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Email</th>
                <th className="p-4">Terms/Limit</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(activeSubTab === 'vendors' ? filteredVendors : filteredCustomers).map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-mono font-bold text-indigo-600">{item.code}</td>
                  <td className="p-4 font-bold text-slate-900">{item.name}</td>
                  <td className="p-4 text-slate-600">{item.contactName}</td>
                  <td className="p-4 text-slate-600">{item.email}</td>
                  <td className="p-4 font-mono font-bold text-slate-900">
                    {activeSubTab === 'vendors' ? item.paymentTerms : `$${item.creditLimit?.toLocaleString()}`}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => setEditingPartner(item)}
                      className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePartner(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Partner Modal */}
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New {activeSubTab === 'vendors' ? 'Vendor' : 'Customer'}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Company / Partner Name *</label>
                <input
                  type="text"
                  required
                  value={newPartner.name}
                  onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Contact Person</label>
                <input
                  type="text"
                  value={newPartner.contactName}
                  onChange={(e) => setNewPartner({ ...newPartner, contactName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Email</label>
                  <input
                    type="email"
                    value={newPartner.email}
                    onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Phone</label>
                  <input
                    type="text"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Partner Modal */}
      {editingPartner && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit {editingPartner.name}</h3>
              <button onClick={() => setEditingPartner(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Partner Name *</label>
                <input
                  type="text"
                  required
                  value={editingPartner.name}
                  onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editingPartner.contactName}
                  onChange={(e) => setEditingPartner({ ...editingPartner, contactName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Email</label>
                  <input
                    type="email"
                    value={editingPartner.email}
                    onChange={(e) => setEditingPartner({ ...editingPartner, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingPartner.phone}
                    onChange={(e) => setEditingPartner({ ...editingPartner, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Address</label>
                <input
                  type="text"
                  value={editingPartner.address || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">
                  {activeSubTab === 'vendors' ? 'Payment Terms' : 'Credit Limit (₹ INR)'}
                </label>
                <input
                  type="text"
                  value={activeSubTab === 'vendors' ? (editingPartner.paymentTerms || '') : (editingPartner.creditLimit || '')}
                  onChange={(e) => {
                    if (activeSubTab === 'vendors') {
                      setEditingPartner({ ...editingPartner, paymentTerms: e.target.value });
                    } else {
                      setEditingPartner({ ...editingPartner, creditLimit: parseFloat(e.target.value) || 0 });
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPartner(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Update Partner
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
