import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { KitBOM } from '@/src/types';
import { uploadImage } from '@/src/utils/storage';

interface CreateKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateKit: (kit: Omit<KitBOM, 'id'>) => Promise<void>;
}

export default function CreateKitModal({ isOpen, onClose, onCreateKit }: CreateKitModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      const kitData: Omit<KitBOM, 'id'> = {
        name: name.trim(),
        description: description.trim(),
        items: [],
      };
      
      if (imageFile) {
        kitData.imageUrl = await uploadImage(imageFile, `kits/${Date.now()}_${imageFile.name}`);
      }
      
      await onCreateKit(kitData);
      
      // reset
      setName('');
      setDescription('');
      setImageFile(null);
      setPreviewUrl(null);
      
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create kit.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-4 h-4" />
             </div>
             <h2 className="text-lg font-bold text-slate-900">Create New Kit</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-5">
           
          <div className="flex gap-5 items-start">
             <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
               {previewUrl ? (
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                 <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
               )}
               <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Upload className="w-4 h-4" />
               </div>
               <input 
                 type="file" 
                 accept="image/*" 
                 className="hidden" 
                 ref={fileInputRef}
                 onChange={handleImageChange}
               />
             </div>
             <div className="flex-1 space-y-4">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kit Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Motor X Starter Kit"
                      className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    />
                 </div>
             </div>
          </div>

          <div>
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description (Optional)</label>
             <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this assembly..."
                rows={3}
                className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all resize-none"
             />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
             <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
             >
                Cancel
             </button>
             <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
             >
                {isSaving ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : null}
                Create Kit Profile
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
