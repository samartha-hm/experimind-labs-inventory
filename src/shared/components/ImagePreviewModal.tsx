import React from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Sparkles, Tag, Layers, MapPin } from 'lucide-react';
import ItemImage from './ItemImage';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title: string;
  subtitle?: string;
  category?: string;
  badge?: string;
  sku?: string;
  binLocation?: string;
  stockQty?: number;
  unit?: string;
  details?: { label: string; value: string | number }[];
}

export default function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
  category,
  badge,
  sku,
  binLocation,
  stockQty,
  unit = 'pcs',
  details = []
}: ImagePreviewModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-white">{title}</h3>
              {category && (
                <span className="text-[10px] text-slate-400 font-mono">{category}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Open original high-res image"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Big Visual Photo Display */}
        <div className="w-full h-80 sm:h-96 bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
          <ItemImage
            src={imageUrl}
            alt={title}
            category={category}
            className="w-full h-full object-contain filter drop-shadow-2xl transition-transform duration-300 hover:scale-105"
          />

          {badge && (
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-indigo-600 text-white shadow-lg">
                {badge}
              </span>
            </div>
          )}

          {typeof stockQty === 'number' && (
            <div className="absolute top-4 right-4">
              <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-lg ${
                stockQty > 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {stockQty > 0 ? `In Stock: ${stockQty} ${unit}` : 'Out of Stock'}
              </span>
            </div>
          )}
        </div>

        {/* Footer Meta Details */}
        <div className="p-5 bg-slate-900/90 border-t border-slate-800 space-y-3">
          {subtitle && (
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {sku && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono font-bold text-[10px] border border-slate-700">
                SKU: {sku}
              </span>
            )}
            {binLocation && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/40 text-amber-300 font-medium text-[10px] border border-amber-800/60 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" /> {binLocation}
              </span>
            )}
            {details.map((d, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                <strong className="text-slate-400">{d.label}:</strong> {d.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
