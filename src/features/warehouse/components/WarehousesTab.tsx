import React, { useState } from 'react';
import { Warehouse, Layers, Plus, MapPin, CheckCircle2, Box, ArrowRight, Edit2, Trash2, X } from 'lucide-react';

import { useData } from '@/src/DataContext';

interface WarehousesTabProps {
  role: string | null;
}

export default function WarehousesTab({ role }: WarehousesTabProps) {
  const {
    warehouses,
    bins,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    addBin,
    deleteBin,
  } = useData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWh, setNewWh] = useState({ code: '', name: '', address: '' });
  const [editingWh, setEditingWh] = useState<any | null>(null);

  // New Bin State
  const [newBinCode, setNewBinCode] = useState('');
  const [newBinDesc, setNewBinDesc] = useState('');
  const [newBinWhCode, setNewBinWhCode] = useState('');
  const [isAddBinOpen, setIsAddBinOpen] = useState(false);

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWh.name) return;

    const created = {
      code: newWh.code || `WH-DC-0${warehouses.length + 1}`,
      name: newWh.name,
      address: newWh.address || 'Tech Logistics Park',
      isDefault: false,
    };
    await addWarehouse(created);
    setIsAddModalOpen(false);
    setNewWh({ code: '', name: '', address: '' });
  };

  const handleEditSaveWh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWh) return;

    await updateWarehouse(editingWh.id, editingWh);
    setEditingWh(null);
  };

  const handleDeleteWh = async (id: string) => {
    if (confirm('Are you sure you want to delete this warehouse facility?')) {
      await deleteWarehouse(id);
    }
  };

  const handleDeleteBin = async (id: string) => {
    if (confirm('Are you sure you want to delete this bin storage location?')) {
      await deleteBin(id);
    }
  };

  const handleAddBinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBinCode) return;
    await addBin({
      code: newBinCode,
      description: newBinDesc,
      warehouseCode: newBinWhCode || warehouses[0]?.code || 'WH-MAIN-01',
    });
    setNewBinCode('');
    setNewBinDesc('');
    setIsAddBinOpen(false);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-indigo-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/80">
              <Warehouse className="w-5 h-5" />
            </div>
            Warehouses & Bin Storage Locations
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Multi-facility warehouse topology, rack occupancy meters, and bin assignment mapping with full owner control.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Warehouse Facility</span>
        </button>
      </div>

      {/* Warehouse Facilities Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {warehouses.map((wh) => (
          <div
            key={wh.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-xl transition-all space-y-4 relative group"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-indigo-600 font-mono tracking-wider">{wh.code}</span>
                  {wh.isDefault && (
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200/60">
                      Default Facility
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg mt-0.5">{wh.name}</h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingWh(wh)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                  title="Edit Facility"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteWh(wh.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete Facility"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 font-medium">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                {wh.address}
              </p>

              {/* Occupancy Progress Bar */}
              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Facility Capacity Occupancy</span>
                  <span className="text-indigo-600 font-mono">{wh.totalCapacityPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${wh.totalCapacityPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Box className="w-4 h-4 text-indigo-500" /> Storage Bins Configured:
              </span>
              <span className="text-slate-900 font-mono">{wh.binCount} active bins</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bin Locations Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" /> Configured Bin Storage Locations ({bins.length})
          </h3>
          <button
            onClick={() => setIsAddBinOpen(true)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-indigo-600" /> Add Storage Bin
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Bin Code</th>
                <th className="p-3">Facility</th>
                <th className="p-3">Shelf / Zone Description</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bins.map((bin) => (
                <tr key={bin.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono font-bold text-indigo-600">{bin.code}</td>
                  <td className="p-3 font-bold text-slate-800">{bin.warehouseCode}</td>
                  <td className="p-3 text-slate-600">{bin.description}</td>
                  <td className="p-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      Active Bin
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDeleteBin(bin.id)}
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
      </div>

      {/* Add Warehouse Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Warehouse Facility</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Assembly Hub"
                  value={newWh.name}
                  onChange={(e) => setNewWh({ ...newWh, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Facility Code</label>
                <input
                  type="text"
                  placeholder="WH-SOUTH-03"
                  value={newWh.code}
                  onChange={(e) => setNewWh({ ...newWh, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="88 Logistics Blvd, Atlanta, GA"
                  value={newWh.address}
                  onChange={(e) => setNewWh({ ...newWh, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Warehouse Modal */}
      {editingWh && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Facility {editingWh.code}</h3>
              <button onClick={() => setEditingWh(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSaveWh} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={editingWh.name}
                  onChange={(e) => setEditingWh({ ...editingWh, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Address</label>
                <input
                  type="text"
                  value={editingWh.address}
                  onChange={(e) => setEditingWh({ ...editingWh, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingWh(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Update Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Bin Modal */}
      {isAddBinOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Storage Bin Location</h3>
              <button onClick={() => setIsAddBinOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBinSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Bin Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BIN-A1-03"
                  value={newBinCode}
                  onChange={(e) => setNewBinCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Warehouse Facility *</label>
                <select
                  value={newBinWhCode}
                  onChange={(e) => setNewBinWhCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.code}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Shelf / Zone Description</label>
                <input
                  type="text"
                  placeholder="e.g. Shelf A1 - Top Rack"
                  value={newBinDesc}
                  onChange={(e) => setNewBinDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBinOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Save Bin Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
