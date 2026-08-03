import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Package, Clock, Settings } from 'lucide-react';
import { InventoryItem, KitBOM } from '@/src/types';
import { uploadImage } from '@/src/utils/storage';
import { useData } from '@/src/DataContext';
import DiffViewer from '@/src/components/DiffViewer';

interface EditPartModalProps {
  item: InventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  existingCategories: string[];
  kits?: KitBOM[];
}

export default function EditPartModal({
  item,
  isOpen,
  onClose,
  onSave,
  existingCategories,
  kits = [],
}: EditPartModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const { transactions } = useData() as any;

  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [stock, setStock] = useState(item.stockQty.toString());
  const [unit, setUnit] = useState(item.unit);
  const [threshold, setThreshold] = useState(item.threshold.toString());
  const [assignedKitName, setAssignedKitName] = useState(item.assignedKitName || '');
  const [isCommon, setIsCommon] = useState(item.isCommon || false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(item.name);
      setCategory(item.category);
      setStock(item.stockQty.toString());
      setUnit(item.unit);
      setThreshold(item.threshold.toString());
      setAssignedKitName(item.assignedKitName || '');
      setIsCommon(item.isCommon || false);
      setImageFile(null);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      let imageUrl = item.imageUrl;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, `inventory/${Date.now()}_${imageFile.name}`);
      }

      await onSave(item.id, {
        name: name.trim(),
        category,
        stockQty: Math.max(0, parseInt(stock) || 0),
        unit: unit || 'pcs',
        threshold: Math.max(0, parseInt(threshold) || 0),
        assignedKitName: assignedKitName.trim() || undefined,
        isCommon,
        imageUrl,
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Edit Component
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-semibold text-sm transition-colors ${
              activeTab === 'details' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Properties
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-semibold text-sm transition-colors ${
              activeTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Revision History
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center shrink-0 overflow-hidden relative group">
                  {imageFile ? (
                    <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                  ) : item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                  )}

                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-white"
                    >
                      <Upload className="w-3 h-3" />
                      Upload
                    </button>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setImageFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Part Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Category
                      </label>
                      <input
                        type="text"
                        list="edit-category-options"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium"
                      />
                      <datalist id="edit-category-options">
                        {existingCategories.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

          {/* Associated Composite Kit Option */}
          <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
            <label className="block text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-purple-600" />
              Associated Composite Kit (Optional)
            </label>
            <input
              type="text"
              list="kit-options-list"
              placeholder="e.g. Prastuti Science Experiment Set, Electronics Innovation Kit..."
              value={assignedKitName}
              onChange={(e) => setAssignedKitName(e.target.value)}
              className="w-full text-xs text-slate-800 border border-purple-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-bold"
            />
            <datalist id="kit-options-list">
              {kits.map((k) => (
                <option key={k.id} value={k.name} />
              ))}
              <option value="Prastuti Science Experiment Set" />
              <option value="Electronics Innovation Kit" />
              <option value="Prastuti Maths Activity Set" />
            </datalist>
            <p className="text-[10px] text-purple-700">
              Select or type the composite kit this item belongs to.
            </p>
          </div>


              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Current Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full text-sm font-mono text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Safety Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full text-sm font-mono text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isCommon}
                  onChange={(e) => setIsCommon(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                />
                <div>
                  <div className="text-sm font-bold text-slate-800">Unlimited / Common Part</div>
                  <div className="text-xs text-slate-500">
                    Enable this if stock quantity doesn't need to be strictly tracked (e.g., screws, standard wires).
                  </div>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              {transactions
                .filter(tx => (tx.items.some(i => i.componentId === item.id) || tx.description.toLowerCase().includes(item.name.toLowerCase())) && tx.diffs && tx.diffs.length > 0)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map(tx => (
                  <div key={tx.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-slate-800">{tx.description}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-slate-700">{tx.userName || 'Guest Administrator'}</span>
                          <span className="text-[9px] uppercase px-1 rounded bg-indigo-100 text-indigo-800 font-bold">{tx.userRole || 'admin'}</span>
                          <span>•</span>
                          <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {tx.diffs?.map((diff, idx) => (
                        <DiffViewer 
                          key={idx}
                          label={diff.field}
                          oldValue={diff.oldValue}
                          newValue={diff.newValue}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              {transactions.filter(tx => (tx.items.some(i => i.componentId === item.id) || tx.description.toLowerCase().includes(item.name.toLowerCase())) && tx.diffs && tx.diffs.length > 0).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No property revisions found for this item.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
