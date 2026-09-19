import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, X, Link as LinkIcon, Sparkles } from 'lucide-react';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  onOpenPresetGallery?: () => void;
  fallbackUrl?: string;
  label?: string;
  className?: string;
}

/**
 * Compresses an image file in-browser using HTML5 Canvas to a lightweight base64 Data URL.
 * Max dimension: 800px, quality: 0.82. Works 100% offline.
 */
function compressImageFile(file: File, maxDimension = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function ImageUploadInput({
  value,
  onChange,
  onOpenPresetGallery,
  fallbackUrl = '',
  label = 'Deliverable Artwork / Thumbnail',
  className = ''
}: ImageUploadInputProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayImage = value || fallbackUrl;

  const handleProcessFile = useCallback(async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsProcessing(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      onChange(compressedDataUrl);
    } catch (err) {
      console.error('Failed to compress uploaded image:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [onChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleProcessFile(file);
          break;
        }
      }
    }
  }, [handleProcessFile]);

  return (
    <div
      ref={containerRef}
      onPaste={handlePaste}
      tabIndex={0}
      className={`bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <label className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" /> {label}
        </label>
        <div className="flex items-center gap-3">
          {onOpenPresetGallery && (
            <button
              type="button"
              onClick={onOpenPresetGallery}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" /> Preset Gallery
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LinkIcon className="w-3 h-3" /> {showUrlInput ? 'Hide URL' : 'Enter URL'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Thumbnail Preview with Remove Button */}
        <div className="relative group shrink-0">
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center">
            {displayImage ? (
              <img
                src={displayImage}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-slate-600" />
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              title="Remove custom image"
              className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-md transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 border-2 border-dashed rounded-xl p-2.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 min-h-[56px] ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          {isProcessing ? (
            <span className="text-xs font-semibold text-indigo-400 animate-pulse">
              Optimizing Image...
            </span>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Upload from Device</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Drag & drop, click to browse, or press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">Ctrl+V</kbd> to paste
              </p>
            </>
          )}
        </div>
      </div>

      {/* Optional URL Input Fallback */}
      {showUrlInput && (
        <div className="pt-1">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste direct image URL (https://...)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />
        </div>
      )}
    </div>
  );
}
