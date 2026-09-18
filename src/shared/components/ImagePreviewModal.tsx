import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ExternalLink,
  Sparkles,
  Tag,
  Layers,
  MapPin,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Crop,
  Download,
  Copy,
  Check,
  Barcode,
  RotateCw
} from 'lucide-react';
import ItemImage from './ItemImage';
import ImageCropStudioModal from './ImageCropStudioModal';
import { downloadImageFile } from '@/src/utils/imageStudioHelper';

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
  onSaveImage?: (newImageUrl: string) => void;
  editable?: boolean;
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
  details = [],
  onSaveImage,
  editable = false
}: ImagePreviewModalProps) {
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showCropStudio, setShowCropStudio] = useState<boolean>(false);
  const [showBarcodeOverlay, setShowBarcodeOverlay] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Reset zoom on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setShowCropStudio(false);
      setShowBarcodeOverlay(false);
      setCopied(false);
    }
  }, [isOpen, imageUrl]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom(prev => Math.min(5.0, Math.max(1.0, +(prev + delta).toFixed(2))));
  };

  // Drag-to-pan handlers when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    downloadImageFile(imageUrl, `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_highres.webp`);
  };

  const handleCopy = async () => {
    if (!imageUrl) return;
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image URL:', err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`relative bg-slate-900 border border-slate-700/80 rounded-3xl w-full overflow-hidden shadow-2xl animate-scaleUp flex flex-col transition-all duration-300 ${
          isFullscreen ? 'fixed inset-2 sm:inset-4 max-w-none max-h-none h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)]' : 'max-w-3xl max-h-[92vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">{title}</h3>
              {category && (
                <span className="text-[10px] text-slate-400 font-mono">{category}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Crop / Edit Studio Button */}
            {(editable || onSaveImage) && imageUrl && (
              <button
                type="button"
                onClick={() => setShowCropStudio(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                title="Open Smart Crop & Enhancement Studio"
              >
                <Crop className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Crop / Edit</span>
              </button>
            )}

            {/* Barcode Overlay Toggle */}
            {(sku || binLocation) && (
              <button
                type="button"
                onClick={() => setShowBarcodeOverlay(!showBarcodeOverlay)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  showBarcodeOverlay
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Toggle Barcode / Storage Bin Label Overlay"
              >
                <Barcode className="w-4 h-4" />
              </button>
            )}

            {/* Download High-Res */}
            {imageUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Download High-Res Image"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* Copy Link */}
            {imageUrl && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Copy Image URL"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Open original high-res in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Big Visual Photo Display with Deep Zoom Viewport */}
        <div
          className="w-full flex-1 min-h-[300px] sm:min-h-[420px] bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            }}
          >
            <ItemImage
              src={imageUrl}
              alt={title}
              category={category}
              className="max-w-full max-h-full object-contain filter drop-shadow-2xl pointer-events-none"
            />
          </div>

          {/* Floating Badges */}
          {badge && (
            <div className="absolute top-4 left-4 pointer-events-none">
              <span className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-indigo-600 text-white shadow-lg backdrop-blur-md">
                {badge}
              </span>
            </div>
          )}

          {typeof stockQty === 'number' && (
            <div className="absolute top-4 right-4 pointer-events-none">
              <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-lg backdrop-blur-md ${
                stockQty > 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {stockQty > 0 ? `In Stock: ${stockQty} ${unit}` : 'Out of Stock'}
              </span>
            </div>
          )}

          {/* Barcode & Storage Bin Overlay Preview */}
          {showBarcodeOverlay && (
            <div className="absolute bottom-16 right-4 bg-slate-900/95 border border-slate-700 p-3 rounded-2xl shadow-2xl backdrop-blur-md text-left space-y-1 animate-fadeIn pointer-events-none max-w-xs">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5" /> STEM Lab Label
              </div>
              <div className="font-mono font-bold text-xs text-white truncate">{sku || title}</div>
              {binLocation && (
                <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" /> Bin: {binLocation}
                </div>
              )}
            </div>
          )}

          {/* Deep Zoom Floating Control Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(1.0, +(prev - 0.25).toFixed(2)))}
              disabled={zoom <= 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-bold text-indigo-300 min-w-[48px] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(5.0, +(prev + 0.25).toFixed(2)))}
              disabled={zoom >= 5}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {zoom > 1 && (
              <>
                <div className="h-4 w-px bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="text-[10px] font-bold text-indigo-400 hover:text-white hover:bg-slate-800 px-2 py-0.5 rounded-lg cursor-pointer"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer Meta Details */}
        <div className="p-5 bg-slate-900/95 border-t border-slate-800 space-y-3">
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

      {/* Embedded Crop Studio Modal */}
      {showCropStudio && imageUrl && (
        <ImageCropStudioModal
          isOpen={showCropStudio}
          onClose={() => setShowCropStudio(false)}
          imageSrc={imageUrl}
          itemName={title}
          itemCategory={category}
          onSave={(newImg) => {
            if (onSaveImage) {
              onSaveImage(newImg);
            }
            setShowCropStudio(false);
          }}
        />
      )}
    </div>,
    document.body
  );
}
