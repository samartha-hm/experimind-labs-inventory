import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Plus,
  QrCode,
  ShieldCheck,
  Tag,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Box,
  Truck,
  RotateCcw,
  Trash2,
  FileSpreadsheet,
  Check,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import BarcodeSvg from '@/src/shared/components/BarcodeSvg';
import { SerialStatus } from '@/src/entity/SerialNumber';

interface SerialNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
}

export default function SerialNumbersModal({
  isOpen,
  onClose,
  preselectedItemId
}: SerialNumbersModalProps) {
  const {
    inventory,
    warehouses,
    bins,
    serialNumbers,
    loadSerialNumbers,
    registerBulkSerials,
    updateSerialStatus,
    deleteSerialNumber
  } = useData();

  const { showToast } = useToast();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId || 'ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');

  // Active Serial Selection for Audit Pedigree
  const [selectedSerial, setSelectedSerial] = useState<any | null>(null);

  // Bulk Register Modal State
  const [isBulkIntakeOpen, setIsBulkIntakeOpen] = useState(false);
  const [intakeItemId, setIntakeItemId] = useState<string>(preselectedItemId || inventory[0]?.id || '');
  const [intakeWarehouse, setIntakeWarehouse] = useState<string>(warehouses[0]?.code || 'WH-MAIN-01');
  const [intakeBin, setIntakeBin] = useState<string>('A-01');
  const [intakeBatch, setIntakeBatch] = useState<string>('');
  const [intakeUnitCost, setIntakeUnitCost] = useState<number>(0);
  const [intakeWarrantyMonths, setIntakeWarrantyMonths] = useState<number>(12);
  const [intakeMode, setIntakeMode] = useState<'generate' | 'manual'>('generate');
  const [genPrefix, setGenPrefix] = useState<string>('SN-EXP-');
  const [genCount, setGenCount] = useState<number>(10);
  const [genStartNum, setGenStartNum] = useState<number>(1001);
  const [manualSerialsText, setManualSerialsText] = useState<string>('');
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  // Status Change Modal State
  const [isStatusChangeOpen, setIsStatusChangeOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<SerialStatus>('ALLOCATED');
  const [statusLocation, setStatusLocation] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSerialNumbers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
      setIntakeItemId(preselectedItemId);
    }
  }, [preselectedItemId]);

  // Filtered List
  const filteredSerials = useMemo(() => {
    return serialNumbers.filter((s: any) => {
      if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;
      if (selectedItemId !== 'ALL' && s.inventoryItemId !== selectedItemId) return false;
      if (selectedWarehouse !== 'ALL' && s.warehouseId !== selectedWarehouse) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sMatch = s.serialNumber?.toLowerCase().includes(q);
        const iMatch = s.inventoryItem?.name?.toLowerCase().includes(q);
        const bMatch = s.batchNumber?.toLowerCase().includes(q);
        if (!sMatch && !iMatch && !bMatch) return false;
      }
      return true;
    });
  }, [serialNumbers, selectedStatus, selectedItemId, selectedWarehouse, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = serialNumbers.length;
    const inStock = serialNumbers.filter(s => s.status === 'IN_STOCK').length;
    const allocated = serialNumbers.filter(s => s.status === 'ALLOCATED').length;
    const installed = serialNumbers.filter(s => s.status === 'INSTALLED').length;
    const rma = serialNumbers.filter(s => s.status === 'RMA_RETURNED' || s.status === 'SCRAPPED').length;
    return { total, inStock, allocated, installed, rma };
  }, [serialNumbers]);

  // Handle Bulk Registration Submit
  const handleBulkRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeItemId) {
      alert('Please select an inventory item');
      return;
    }

    let serialsToRegister: string[] = [];

    if (intakeMode === 'generate') {
      for (let i = 0; i < genCount; i++) {
        serialsToRegister.push(`${genPrefix}${String(genStartNum + i).padStart(4, '0')}`);
      }
    } else {
      serialsToRegister = manualSerialsText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }

    if (serialsToRegister.length === 0) {
      alert('Please provide or generate at least one serial number.');
      return;
    }

    try {
      setIsSubmittingIntake(true);
      const res = await registerBulkSerials({
        serialNumbers: serialsToRegister,
        inventoryItemId: intakeItemId,
        warehouseId: intakeWarehouse,
        binId: intakeBin,
        batchNumber: intakeBatch || undefined,
        unitCost: intakeUnitCost,
        warrantyMonths: intakeWarrantyMonths,
        notes: `Bulk registered ${serialsToRegister.length} serialized units`
      });

      showToast('success', 'Serials Registered', `Successfully registered ${res.registeredCount || serialsToRegister.length} serialized units.`);
      setIsBulkIntakeOpen(false);
      setManualSerialsText('');
      loadSerialNumbers();
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  // Handle Status Update Submit
  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSerial) return;

    try {
      setIsSubmittingStatus(true);
      await updateSerialStatus(selectedSerial.id, targetStatus, statusLocation, statusNotes);
      showToast('success', 'Lifecycle Updated', `Serial ${selectedSerial.serialNumber} marked as ${targetStatus}`);
      setIsStatusChangeOpen(false);
      setStatusNotes('');
      // Refresh active selection
      const updated = await loadSerialNumbers();
      const match = updated.find((s: any) => s.id === selectedSerial.id);
      if (match) setSelectedSerial(match);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: SerialStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            In Stock
          </span>
        );
      case 'ALLOCATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="w-3 h-3" />
            Allocated to Kit / SO
          </span>
        );
      case 'INSTALLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShieldCheck className="w-3 h-3" />
            Installed in Field
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Truck className="w-3 h-3" />
            In Transit
          </span>
        );
      case 'RMA_RETURNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RotateCcw className="w-3 h-3" />
            RMA / Returned
          </span>
        );
      case 'SCRAPPED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Trash2 className="w-3 h-3" />
            Scrapped / Decommissioned
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative my-auto w-full max-w-7xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Serialized Asset Pedigree & Unit Tracking
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                  Unit-Level DNA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Track individual unit lifecycle, warranty validity, location history, and linked customer deployments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBulkIntakeOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Intake / Bulk Register Serials
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-6 border-b border-slate-800 bg-slate-950/40">
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl">
            <div className="text-xs text-slate-400 font-medium">Total Serialized</div>
            <div className="text-2xl font-bold text-white mt-1">{metrics.total}</div>
          </div>
          <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <div className="text-xs text-emerald-400 font-medium">In Stock (Available)</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics.inStock}</div>
          </div>
          <div className="p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <div className="text-xs text-blue-400 font-medium">Allocated to Kits/SO</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">{metrics.allocated}</div>
          </div>
          <div className="p-3.5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
            <div className="text-xs text-cyan-400 font-medium">Deployed / Installed</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{metrics.installed}</div>
          </div>
          <div className="p-3.5 bg-purple-500/5 border border-purple-500/20 rounded-xl">
            <div className="text-xs text-purple-400 font-medium">RMA & Scrapped</div>
            <div className="text-2xl font-bold text-purple-400 mt-1">{metrics.rma}</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search serial number, component name, or batch..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <select
            value={selectedItemId}
            onChange={e => setSelectedItemId(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Components</option>
            {inventory.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="INSTALLED">Installed</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="RMA_RETURNED">RMA Returned</option>
            <option value="SCRAPPED">Scrapped</option>
          </select>

          <select
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Warehouses</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.code}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>

          <button
            onClick={() => loadSerialNumbers()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Refresh Serials"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Content Layout: Table & Detail Inspector */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
          
          {/* List Column */}
          <div className="lg:col-span-2 overflow-y-auto border-r border-slate-800 p-6 space-y-2">
            {filteredSerials.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Box className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-base font-medium text-slate-300">No Serial Numbers Found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click "Intake / Bulk Register Serials" to register serialized units for microcontrollers, sensors, or boards.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSerials.map((serial: any) => {
                  const isSelected = selectedSerial?.id === serial.id;
                  return (
                    <div
                      key={serial.id}
                      onClick={() => setSelectedSerial(serial)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/50'
                          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white">
                              {serial.serialNumber}
                            </span>
                            {renderStatusBadge(serial.status)}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                            <span className="text-slate-300 font-medium">
                              {serial.inventoryItem?.name || 'Component'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {serial.warehouseId} / {serial.binId || 'Unassigned'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs font-medium text-slate-300">
                            ₹{Number(serial.unitCost || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {serial.warrantyExpiry
                              ? `Warranty: ${new Date(serial.warrantyExpiry).toLocaleDateString()}`
                              : 'Standard Warranty'}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pedigree & Timeline Detail Column */}
          <div className="overflow-y-auto p-6 bg-slate-950/30">
            {selectedSerial ? (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Serial Card Header */}
                <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      Unit Pedigree Card
                    </span>
                    {renderStatusBadge(selectedSerial.status)}
                  </div>
                  <div className="font-mono text-lg font-bold text-white break-all">
                    {selectedSerial.serialNumber}
                  </div>
                  <div className="text-sm font-medium text-slate-300">
                    {selectedSerial.inventoryItem?.name}
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-center">
                    <div className="bg-white p-2 rounded-lg">
                      <BarcodeSvg value={selectedSerial.serialNumber} width={180} height={45} />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setTargetStatus(
                        selectedSerial.status === 'IN_STOCK' ? 'ALLOCATED' : 'IN_STOCK'
                      );
                      setStatusLocation(selectedSerial.binId || '');
                      setIsStatusChangeOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Transition Lifecycle
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Remove serialized record "${selectedSerial.serialNumber}"?`)) {
                        await deleteSerialNumber(selectedSerial.id);
                        showToast('info', 'Record Removed', `Deleted ${selectedSerial.serialNumber}`);
                        setSelectedSerial(null);
                        loadSerialNumbers();
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Scrap / Remove
                  </button>
                </div>

                {/* Properties Table */}
                <div className="space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                    Asset Specifications
                  </h4>
                  <div className="space-y-1.5 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Warehouse / Bin</span>
                      <span className="text-white font-medium">
                        {selectedSerial.warehouseId} / {selectedSerial.binId || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Batch Code</span>
                      <span className="text-white font-medium">
                        {selectedSerial.batchNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Unit Valuation</span>
                      <span className="text-white font-medium">
                        ₹{Number(selectedSerial.unitCost || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Warranty Expiration</span>
                      <span className="text-white font-medium">
                        {selectedSerial.warrantyExpiry
                          ? new Date(selectedSerial.warrantyExpiry).toLocaleDateString()
                          : 'No Expiry Set'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit Pedigree Timeline */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                    Lifecycle Audit Pedigree
                  </h4>
                  <div className="space-y-3 border-l-2 border-slate-800 pl-4 ml-2">
                    {(selectedSerial.history && selectedSerial.history.length > 0
                      ? selectedSerial.history
                      : [
                          {
                            timestamp: selectedSerial.createdAt,
                            action: 'INITIAL_REGISTRATION',
                            status: selectedSerial.status,
                            user: 'System Admin',
                            location: `${selectedSerial.warehouseId} / ${selectedSerial.binId}`,
                            notes: 'Registered in database'
                          }
                        ]
                    ).map((entry: any, idx: number) => (
                      <div key={idx} className="relative space-y-1">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-slate-900"></span>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{entry.action}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(entry.timestamp).toLocaleDateString()}{' '}
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {entry.notes || `Transitioned to ${entry.status}`}
                        </div>
                        {entry.location && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {entry.location}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-24 text-slate-500">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                <p className="text-sm font-medium text-slate-400">Select a Serial Number</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  View complete unit history, warranty details, and lifecycle audit pedigree.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ----------------------------------------------------------- */}
        {/* MODAL 1: BULK INTAKE REGISTER DIALOG */}
        {/* ----------------------------------------------------------- */}
        {isBulkIntakeOpen && createPortal(
          <div className="fixed inset-0 w-screen h-screen z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative my-auto w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-lg">
                  <Plus className="w-5 h-5 text-indigo-400" />
                  Intake Serialized Units
                </div>
                <button
                  onClick={() => setIsBulkIntakeOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBulkRegisterSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Component</label>
                  <select
                    value={intakeItemId}
                    onChange={e => setIntakeItemId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} (In stock: {i.stockQty} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Warehouse</label>
                    <select
                      value={intakeWarehouse}
                      onChange={e => setIntakeWarehouse(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    >
                      {warehouses.map(w => (
                        <option key={w.id} value={w.code}>
                          {w.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Default Bin</label>
                    <input
                      type="text"
                      value={intakeBin}
                      onChange={e => setIntakeBin(e.target.value)}
                      placeholder="e.g. A-01"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Batch Code</label>
                    <input
                      type="text"
                      value={intakeBatch}
                      onChange={e => setIntakeBatch(e.target.value)}
                      placeholder="e.g. B26-08"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Unit Cost (₹)</label>
                    <input
                      type="number"
                      value={intakeUnitCost}
                      onChange={e => setIntakeUnitCost(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Warranty (Mo)</label>
                    <input
                      type="number"
                      value={intakeWarrantyMonths}
                      onChange={e => setIntakeWarrantyMonths(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIntakeMode('generate')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${
                      intakeMode === 'generate' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Auto Sequence Generator
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntakeMode('manual')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${
                      intakeMode === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Paste Scanned List
                  </button>
                </div>

                {intakeMode === 'generate' ? (
                  <div className="space-y-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Prefix</label>
                        <input
                          type="text"
                          value={genPrefix}
                          onChange={e => setGenPrefix(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Start #</label>
                        <input
                          type="number"
                          value={genStartNum}
                          onChange={e => setGenStartNum(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Quantity</label>
                        <input
                          type="number"
                          value={genCount}
                          onChange={e => setGenCount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Preview: <span className="font-mono text-indigo-300 font-bold">{genPrefix}{String(genStartNum).padStart(4, '0')}</span> to{' '}
                      <span className="font-mono text-indigo-300 font-bold">{genPrefix}{String(genStartNum + genCount - 1).padStart(4, '0')}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Paste Barcode Scans (one per line or comma-separated)
                    </label>
                    <textarea
                      rows={4}
                      value={manualSerialsText}
                      onChange={e => setManualSerialsText(e.target.value)}
                      placeholder="SN-ESP-001&#10;SN-ESP-002&#10;SN-ESP-003"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsBulkIntakeOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingIntake}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30"
                  >
                    {isSubmittingIntake ? 'Registering...' : 'Register Serial Units'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ----------------------------------------------------------- */}
        {/* MODAL 2: STATUS LIFECYCLE TRANSITION */}
        {/* ----------------------------------------------------------- */}
        {isStatusChangeOpen && selectedSerial && createPortal(
          <div className="fixed inset-0 w-screen h-screen z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative my-auto w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Transition Asset Lifecycle
                </div>
                <button
                  onClick={() => setIsStatusChangeOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleStatusChangeSubmit} className="space-y-4 text-xs">
                <div className="p-3 bg-slate-800/60 rounded-xl space-y-1">
                  <span className="text-slate-400">Target Serial:</span>
                  <div className="font-mono text-white font-bold text-sm">
                    {selectedSerial.serialNumber}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">New Lifecycle Status</label>
                  <select
                    value={targetStatus}
                    onChange={e => setTargetStatus(e.target.value as SerialStatus)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="IN_STOCK">IN_STOCK (Available in Warehouse)</option>
                    <option value="ALLOCATED">ALLOCATED (Assigned to Kit Assembly / Sales Order)</option>
                    <option value="INSTALLED">INSTALLED (Deployed to Client Site)</option>
                    <option value="IN_TRANSIT">IN_TRANSIT (In Courier / Logistics)</option>
                    <option value="RMA_RETURNED">RMA_RETURNED (Returned for Testing / Repair)</option>
                    <option value="SCRAPPED">SCRAPPED (Decommissioned)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Current Location / Rack</label>
                  <input
                    type="text"
                    value={statusLocation}
                    onChange={e => setStatusLocation(e.target.value)}
                    placeholder="e.g. Lab Bench 3 or WH-MAIN / Bin A-02"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Audit Notes / Reason</label>
                  <textarea
                    rows={3}
                    value={statusNotes}
                    onChange={e => setStatusNotes(e.target.value)}
                    placeholder="e.g. Installed in Pro Educational Kit #102 for STEM Workshop"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsStatusChangeOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStatus}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30"
                  >
                    {isSubmittingStatus ? 'Saving...' : 'Update Status & Audit Log'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      </div>
    </div>,
    document.body
  );
}
