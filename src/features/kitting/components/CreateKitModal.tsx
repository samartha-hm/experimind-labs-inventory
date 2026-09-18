import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Image as ImageIcon, Sparkles, Palette, Link as LinkIcon } from 'lucide-react';
import { KitBOM } from '@/src/types';
import { uploadImage } from '@/src/utils/storage';
import { useData } from '@/src/DataContext';
import { STEM_PRESET_IMAGES } from '@/src/utils/itemThumbnailHelper';
import ImagePreviewModal from '@/src/shared/components/ImagePreviewModal';

interface CreateKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateKit: (kit: Omit<KitBOM, 'id'>) => Promise<void>;
}

const STANDARD_KIT_SUGGESTIONS = [
  'Grade 8 Optics & Light Bench Kit',
  'Grade 8 Sound & Wave Propagation Kit',
  'Grade 9 Chemical Reactions & Acids Base Kit',
  'Grade 9 Mechanics, Force & Pulley Kit',
  'Grade 10 Electric Current & Dynamo Kit',
  'Grade 10 Human Anatomy & Bio Specimen Kit',
  'ATL Makerspace Robotics Starter Pack',
  '3D Geometry & Solid Mensuration Kit',
  'Periodic Table & Chemistry Reagent Set',
  'Laser Cut MDF Structural Base Crate'
];

export default function CreateKitModal({ isOpen, onClose, onCreateKit }: CreateKitModalProps) {
  const { kits = [] } = useData();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showPresetGallery, setShowPresetGallery] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [zoomPreview, setZoomPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setShowPresetGallery(false);
      setShowUrlInput(false);
    }
  };

  const handleSelectPreset = (url: string) => {
    setPreviewUrl(url);
    setImageFile(null);
    setShowPresetGallery(false);
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setPreviewUrl(customUrlInput.trim());
      setImageFile(null);
      setShowUrlInput(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      let finalImageUrl = previewUrl || undefined;
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile, `kits/${Date.now()}_${imageFile.name}`);
      }

      const kitData: Omit<KitBOM, 'id'> = {
        name: name.trim(),
        description: description.trim(),
        imageUrl: finalImageUrl,
        items: [],
      };
      
      await onCreateKit(kitData);
      
      // reset
      setName('');
      setDescription('');
      setImageFile(null);
      setPreviewUrl(null);
      setCustomUrlInput('');
      
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create kit.');
    } finally {
      setIsSaving(false);
    }
  };

  const allSuggestions = Array.from(new Set([
    ...STANDARD_KIT_SUGGESTIONS,
    ...kits.map(k => k.name)
  ]));

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] sm:max-h-[90vh] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-0">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-4 h-4" />
             </div>
             <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Composite Kit</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-5 overflow-y-auto">
          <div className="flex gap-5 items-start">
             <div
               className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer"
               onClick={() => {
                 if (previewUrl) {
                   setZoomPreview(true);
                 } else {
                   fileInputRef.current?.click();
                 }
               }}
               title={previewUrl ? 'Click to zoom high-res' : 'Upload photo'}
             >
               {previewUrl ? (
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                 <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
               )}
               <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                  {previewUrl ? 'View / Change' : 'Upload'}
               </div>
               <input 
                 type="file" 
                 accept="image/*" 
                 className="hidden" 
                 ref={fileInputRef}
                 onChange={handleImageChange}
               />
             </div>

             <div className="flex-1 space-y-3">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kit Name *</label>
                    <input
                      type="text"
                      required
                      list="kit-name-suggestions"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Grade 8 Optics & Light Bench Kit"
                      className="w-full text-xs text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    />
                    <datalist id="kit-name-suggestions">
                      {allSuggestions.map((s, idx) => (
                        <option key={idx} value={s} />
                      ))}
                    </datalist>
                 </div>

                 {/* Photo Selector Controls */}
                 <div className="flex flex-wrap items-center gap-2">
                   <button
                     type="button"
                     onClick={() => fileInputRef.current?.click()}
                     className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                   >
                     <Upload className="w-3 h-3" /> Upload
                   </button>
                   <button
                     type="button"
                     onClick={() => {
                       setShowPresetGallery(!showPresetGallery);
                       setShowUrlInput(false);
                     }}
                     className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                   >
                     <Palette className="w-3 h-3" /> Presets
                   </button>
                   <button
                     type="button"
                     onClick={() => {
                       setShowUrlInput(!showUrlInput);
                       setShowPresetGallery(false);
                     }}
                     className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                   >
                     <LinkIcon className="w-3 h-3" /> Image URL
                   </button>
                 </div>
             </div>
          </div>

          {/* Preset Image Picker Box */}
          {showPresetGallery && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 animate-fadeIn">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Select a STEM Preset Photo</div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1">
                {STEM_PRESET_IMAGES.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.url)}
                    className="group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-indigo-500 cursor-pointer relative aspect-square shadow-2xs transition-all hover:scale-105"
                    title={preset.name}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 text-xs filter drop-shadow">{preset.emoji}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom URL Input Box */}
          {showUrlInput && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex gap-2 items-center animate-fadeIn">
              <input
                type="url"
                placeholder="https://images.unsplash.com/... or Google Drive URL"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleApplyCustomUrl}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}

          <div>
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description (Optional)</label>
             <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief curriculum and assembly guidelines for this composite kit..."
                rows={3}
                className="w-full text-xs text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
             />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
             <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
             >
                Cancel
             </button>
             <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
             >
                {isSaving ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : null}
                Create Kit Profile
             </button>
          </div>
        </form>
      </div>

      {zoomPreview && previewUrl && (
        <ImagePreviewModal
          isOpen={zoomPreview}
          onClose={() => setZoomPreview(false)}
          imageUrl={previewUrl}
          title={name || 'Composite Kit Preview'}
          subtitle={description}
          category="Composite Kit Profile"
        />
      )}
    </div>,
    document.body
  );
}

