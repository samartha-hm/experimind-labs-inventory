import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Save, Sparkles, Upload, Image as ImageIcon, Search, Settings, Clock } from 'lucide-react';
import { InventoryItem, KitBOM, BOMRequirement } from '@/src/types';
import { uploadImage } from '@/src/utils/storage';
import { useData } from '@/src/DataContext';
import DiffViewer from '@/src/components/DiffViewer';

interface BOMCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit: KitBOM;
  inventory: InventoryItem[];
  onSaveBOM: (kitId: string, updatedRequirements: BOMRequirement[], updatedKit?: Partial<KitBOM>) => void;
}

export default function BOMCustomizerModal({
  isOpen,
  onClose,
  kit,
  inventory,
  onSaveBOM,
}: BOMCustomizerModalProps) {
  const [requirements, setRequirements] = useState<BOMRequirement[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const { transactions } = useData();
  
  const [isUploading, setIsUploading] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search and Category Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Reset state when kit changes
  useEffect(() => {
    if (isOpen && kit) {
      setRequirements([...(kit.items || [])]);
      setName(kit.name || '');
      setDescription(kit.description || '');
      setPreviewUrl(kit.imageUrl || null);
      setNewImageFile(null);
      setSearchTerm('');
      setSelectedCategory('all');
      setSelectedPartId('');
    }
  }, [isOpen, kit]);

  if (!isOpen) return null;

  const handleQtyChange = (componentId: string, newQtyVal: number) => {
    setRequirements((prev) =>
      prev.map((req) =>
        req.componentId === componentId
          ? { ...req, qty: Math.max(1, newQtyVal) }
          : req
      )
    );
  };

  const handleRemovePart = (componentId: string) => {
    setRequirements((prev) => prev.filter((req) => req.componentId !== componentId));
  };

  const handleAddPart = (partId: string) => {
    if (!partId) return;

    if (requirements.some((req) => req.componentId === partId)) {
      alert('This component is already in the Bill of Materials!');
      return;
    }

    setRequirements((prev) => [
      ...prev,
      { componentId: partId, qty: Math.max(1, parseInt(partQty) || 1) },
    ]);

    setSelectedPartId('');
    setPartQty('1');
    setSearchTerm('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setNewImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('Kit name is required.');
    setIsUploading(true);
    try {
      let imageUrl = kit.imageUrl;
      if (newImageFile) {
        imageUrl = await uploadImage(newImageFile, `kits/${Date.now()}_${newImageFile.name}`);
      }
      onSaveBOM(kit.id, requirements, { name: name.trim(), description: description.trim(), imageUrl });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save changes.");
    } finally {
      setIsUploading(false);
    }
  };

  const availableInventoryParts = inventory.filter(
    (inv) => !requirements.some((req) => req.componentId === inv.id)
  );

  const PREDEFINED_CATS = [
    'Prastuti Science',
    'Electronics',
    'Stationary',
    'others',
    'Chemicals',
    'Box',
    'Prastuti Maths',
    'Anubhav',
    'kits',
    'IQNAAX',
    'Maths kits'
  ];

  const categories = Array.from(
    new Set([...PREDEFINED_CATS, ...inventory.map((inv) => inv.category).filter(Boolean)])
  );

  const filteredParts = availableInventoryParts.filter((part) => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      selectedCategory === 'ALL' ||
      (part.category && part.category.trim().toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Customize Kit Bill of Materials (BOM)
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                Code ID: {kit.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 bg-white">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-semibold text-sm transition-colors ${
              activeTab === 'editor' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            BOM Editor
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto flex flex-col p-6 bg-slate-50/50">
          {activeTab === 'editor' && (
            <div className="flex-1 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group">
                  <div className="w-24 h-24 rounded-2xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shadow-xs relative">
                    {previewUrl ? (
                      <img src={previewUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    Upload Photo
                  </button>
                </div>

                <div className="md:col-span-8 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Kit Profile Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Description / Assembly Guidelines
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Component Catalog Finder */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  Add Component from Catalog
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-4">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-5 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search parts by name or SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3 flex gap-1.5">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Qty</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={partQty}
                        onChange={(e) => setPartQty(e.target.value)}
                        className="w-12 bg-transparent py-2 text-center text-xs focus:outline-none font-mono font-bold text-slate-700"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!selectedPartId}
                      onClick={() => handleAddPart(selectedPartId)}
                      className={`flex-1 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm ${
                        selectedPartId
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl bg-white max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {filteredParts.length > 0 ? (
                    filteredParts.map((part) => (
                      <div
                        key={part.id}
                        onClick={() => setSelectedPartId(part.id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                          selectedPartId === part.id ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">{part.name}</div>
                          <div className="text-[9px] text-slate-400 font-mono">
                            {part.category}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Stock: <span className="font-mono font-bold">{part.stockQty}</span> {part.unit}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No matching parts available in the catalog.
                    </div>
                  )}
                </div>
              </div>
              
              {/* Active BOM list */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Composite Bill of Materials List ({requirements.length} parts)
                </h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {requirements.length > 0 ? (
                    requirements.map((req) => {
                      const part = inventory.find((inv) => inv.id === req.componentId);
                      if (!part) return null;
                      return (
                        <div key={req.componentId} className="p-3 border border-slate-200 rounded-2xl bg-white flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-xs font-bold text-slate-800 block">{part.name}</span>
                            <span className="text-[9px] font-mono text-slate-400">{part.category}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-medium">Needed:</span>
                              <input
                                type="number"
                                min="1"
                                value={req.qty}
                                onChange={(e) => handleQtyChange(req.componentId, parseInt(e.target.value) || 1)}
                                className="w-12 text-center font-mono text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg py-1 focus:outline-none"
                              />
                            </div>
                            <button onClick={() => handleRemovePart(req.componentId)} className="p-1 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-slate-400 py-6 border border-dashed border-slate-200 rounded-2xl">
                      No parts selected. Use the search finder above to add parts to this composite kit.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              {transactions
                .filter(tx => (tx.kitName === kit.name || tx.description.toLowerCase().includes(kit.name.toLowerCase())) && tx.diffs && tx.diffs.length > 0)
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
                      {tx.diffs?.map((diff, idx) => {
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
                ))}
              {transactions.filter(tx => (tx.kitName === kit.name || tx.description.toLowerCase().includes(kit.name.toLowerCase())) && tx.diffs && tx.diffs.length > 0).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No revision history found for this kit's BOM.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === 'editor' && (
          <div className="border-t border-slate-100 bg-white p-5 flex items-center justify-between sticky bottom-0">
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-widest">{requirements.length} Components</span>
              <span className="font-mono text-indigo-600 font-black">
                Total Material Cost: ₹{requirements.reduce((sum, req) => {
                  const part = inventory.find((inv) => inv.id === req.componentId);
                  const cost = Number(part?.unitCost ?? part?.basePrice ?? 0);
                  return sum + (cost * req.qty);
                }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                {isUploading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
