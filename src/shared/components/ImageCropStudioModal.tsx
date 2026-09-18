import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sun,
  Sliders,
  Sparkles,
  Download,
  Check,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image as ImageIcon,
  Layers,
  Sparkle
} from 'lucide-react';
import {
  CropArea,
  ImageAdjustments,
  DEFAULT_ADJUSTMENTS,
  calculateAspectRatioCrop,
  buildCssFilterString,
  renderProcessedImageToDataUrl,
  downloadImageFile
} from '@/src/utils/imageStudioHelper';
import { STEM_PRESET_IMAGES } from '@/src/utils/itemThumbnailHelper';

interface ImageCropStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  itemName?: string;
  itemCategory?: string;
  onSave: (processedDataUrl: string) => void;
  initialAspect?: number | null; // e.g. 1.0 for 1:1, 4/3 for 4:3, 16/9 for 16:9, null for free
}

export default function ImageCropStudioModal({
  isOpen,
  onClose,
  imageSrc,
  itemName = 'Component Image',
  itemCategory,
  onSave,
  initialAspect = 1.0
}: ImageCropStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'crop' | 'enhance' | 'presets'>('crop');
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(imageSrc);
  const [naturalWidth, setNaturalWidth] = useState<number>(800);
  const [naturalHeight, setNaturalHeight] = useState<number>(800);

  // Aspect Ratio selection
  const [aspectMode, setAspectMode] = useState<'1:1' | '4:3' | '16:9' | 'free'>(
    initialAspect === 1.0 ? '1:1' : initialAspect === 4 / 3 ? '4:3' : initialAspect === 16 / 9 ? '16:9' : '1:1'
  );

  // Crop & Adjustments State
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 800, height: 800 });
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Load natural dimensions when image source changes
  useEffect(() => {
    if (!isOpen) return;
    setCurrentImageSrc(imageSrc);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setZoomLevel(1.0);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || 800;
      const h = img.naturalHeight || 800;
      setNaturalWidth(w);
      setNaturalHeight(h);

      const targetAspect = aspectMode === '1:1' ? 1.0 : aspectMode === '4:3' ? 4 / 3 : aspectMode === '16:9' ? 16 / 9 : null;
      setCropArea(calculateAspectRatioCrop(w, h, targetAspect));
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc]);

  // Handle aspect ratio preset change
  const handleAspectChange = (mode: '1:1' | '4:3' | '16:9' | 'free') => {
    setAspectMode(mode);
    const targetAspect = mode === '1:1' ? 1.0 : mode === '4:3' ? 4 / 3 : mode === '16:9' ? 16 / 9 : null;
    setCropArea(calculateAspectRatioCrop(naturalWidth, naturalHeight, targetAspect));
  };

  // Rotation & Flip Helpers
  const handleRotateCw = () => {
    setAdjustments(prev => ({
      ...prev,
      rotation: ((prev.rotation + 90) % 360) as any
    }));
  };

  const handleRotateCcw = () => {
    setAdjustments(prev => ({
      ...prev,
      rotation: ((prev.rotation - 90 + 360) % 360) as any
    }));
  };

  const handleFlipH = () => {
    setAdjustments(prev => ({ ...prev, flipHorizontal: !prev.flipHorizontal }));
  };

  const handleFlipV = () => {
    setAdjustments(prev => ({ ...prev, flipVertical: !prev.flipVertical }));
  };

  const handleResetAdjustments = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setZoomLevel(1.0);
    handleAspectChange('1:1');
  };

  // Apply and Export
  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const resultDataUrl = await renderProcessedImageToDataUrl(
        currentImageSrc,
        cropArea,
        adjustments,
        'image/webp',
        0.92
      );
      onSave(resultDataUrl);
      onClose();
    } catch (err) {
      console.error('Failed to process image:', err);
      alert('Failed to process image crop.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    try {
      const resultDataUrl = await renderProcessedImageToDataUrl(
        currentImageSrc,
        cropArea,
        adjustments,
        'image/webp',
        0.95
      );
      downloadImageFile(resultDataUrl, `${itemName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_edited.webp`);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scaleUp text-slate-100">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
              <Crop className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>Smart Image Studio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Interactive Cropper
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium truncate max-w-sm sm:max-w-md">
                Tuning photo for &ldquo;{itemName}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download edited high-res file"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('crop')}
            className={`py-2.5 px-4 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'crop'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Crop & Transform</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('enhance')}
            className={`py-2.5 px-4 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'enhance'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Enhance & Filters</span>
            {adjustments.autoClarify && (
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`py-2.5 px-4 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'presets'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>STEM Preset Library</span>
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Visual Viewport (Left/Center Column) */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 min-h-[300px] sm:min-h-[400px] relative overflow-hidden group select-none">
            
            <div
              ref={containerRef}
              className="relative max-w-full max-h-[360px] flex items-center justify-center transition-all duration-200"
              style={{
                transform: `scale(${zoomLevel})`,
              }}
            >
              {/* Target Image with Filter Transformations */}
              <img
                ref={imgRef}
                src={currentImageSrc}
                alt="Source Studio"
                crossOrigin="anonymous"
                className="max-h-[340px] max-w-full object-contain rounded-2xl transition-all duration-200 shadow-2xl"
                style={{
                  filter: buildCssFilterString(adjustments),
                  transform: `rotate(${adjustments.rotation}deg) scaleX(${adjustments.flipHorizontal ? -1 : 1}) scaleY(${adjustments.flipVertical ? -1 : 1})`,
                }}
              />

              {/* Visual Crop Frame Overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-indigo-400/80 rounded-2xl pointer-events-none ring-4 ring-black/40">
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono font-bold text-indigo-300">
                  {aspectMode.toUpperCase()} CROP
                </div>
              </div>
            </div>

            {/* Floating Zoom & Pan Control */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.7, +(prev - 0.1).toFixed(2)))}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold text-indigo-300 min-w-[40px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(3.0, +(prev + 0.1).toFixed(2)))}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => setZoomLevel(1.0)}
                className="text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-0.5 rounded-lg cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Controls & Configuration Sidebar (Right Column) */}
          <div className="lg:col-span-4 space-y-4">
            {activeTab === 'crop' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Aspect Ratio Selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Aspect Ratio Lock
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAspectChange('1:1')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                        aspectMode === '1:1'
                          ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300 ring-1 ring-indigo-500'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>1:1 Square</span>
                      <span className="text-[10px] opacity-70">Badge</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAspectChange('4:3')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                        aspectMode === '4:3'
                          ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300 ring-1 ring-indigo-500'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>4:3 Standard</span>
                      <span className="text-[10px] opacity-70">Catalog</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAspectChange('16:9')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                        aspectMode === '16:9'
                          ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300 ring-1 ring-indigo-500'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>16:9 Banner</span>
                      <span className="text-[10px] opacity-70">Showcase</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAspectChange('free')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                        aspectMode === 'free'
                          ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300 ring-1 ring-indigo-500'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>Full Frame</span>
                      <span className="text-[10px] opacity-70">Original</span>
                    </button>
                  </div>
                </div>

                {/* Transform & Rotation Controls */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Orientation & Flip
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={handleRotateCcw}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:border-slate-700"
                      title="Rotate 90° Left"
                    >
                      <RotateCcw className="w-4 h-4 text-indigo-400" />
                      <span className="text-[9px] font-bold">-90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRotateCw}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:border-slate-700"
                      title="Rotate 90° Right"
                    >
                      <RotateCw className="w-4 h-4 text-indigo-400" />
                      <span className="text-[9px] font-bold">+90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFlipH}
                      className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        adjustments.flipHorizontal
                          ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-4 h-4 text-indigo-400" />
                      <span className="text-[9px] font-bold">Flip H</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFlipV}
                      className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        adjustments.flipVertical
                          ? 'border-indigo-500 bg-indigo-950/60 text-indigo-300'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                      }`}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-4 h-4 text-indigo-400" />
                      <span className="text-[9px] font-bold">Flip V</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-indigo-950/30 border border-indigo-900/60 rounded-2xl text-[11px] text-indigo-200/90 leading-relaxed">
                  💡 <strong>Tip:</strong> 1:1 Square crop ensures pixel-perfect fit on barcode labels, bill of material picking lists, and inventory grids.
                </div>
              </div>
            )}

            {activeTab === 'enhance' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Auto Clarify 1-Click Preset */}
                <div
                  onClick={() => setAdjustments(prev => ({ ...prev, autoClarify: !prev.autoClarify }))}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    adjustments.autoClarify
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500/50'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-xs">✨ Auto-Clarify Workshop Photo</div>
                      <div className="text-[10px] text-slate-400">Sharpens labels & boosts contrast</div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    adjustments.autoClarify ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-700'
                  }`}>
                    {adjustments.autoClarify && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* Brightness Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" /> Brightness
                    </span>
                    <span className="font-mono text-indigo-300">{adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={adjustments.brightness}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Contrast Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Contrast</span>
                    <span className="font-mono text-indigo-300">{adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={adjustments.contrast}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Saturation Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Color Saturation</span>
                    <span className="font-mono text-indigo-300">{adjustments.saturation > 0 ? `+${adjustments.saturation}` : adjustments.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={adjustments.saturation}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, saturation: parseInt(e.target.value) }))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Grayscale Toggle */}
                <div
                  onClick={() => setAdjustments(prev => ({ ...prev, grayscale: !prev.grayscale }))}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    adjustments.grayscale
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold">Grayscale Mode (Engineering Blueprints)</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    adjustments.grayscale ? 'border-indigo-500 bg-indigo-500 text-slate-950' : 'border-slate-700'
                  }`}>
                    {adjustments.grayscale && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetAdjustments}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Adjustments
                </button>
              </div>
            )}

            {activeTab === 'presets' && (
              <div className="space-y-3 animate-fadeIn max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Replace with Standard STEM Preset
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {STEM_PRESET_IMAGES.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => {
                        setCurrentImageSrc(preset.url);
                        setActiveTab('crop');
                      }}
                      className="group p-2 rounded-2xl border border-slate-800 bg-slate-950 hover:border-indigo-500 hover:bg-indigo-950/30 transition-all cursor-pointer flex flex-col items-center text-center"
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-16 object-cover rounded-xl border border-slate-800 group-hover:scale-105 transition-transform"
                      />
                      <div className="font-bold text-[11px] text-slate-200 truncate w-full mt-1.5">
                        {preset.name}
                      </div>
                      <div className="text-[9px] text-indigo-400 font-mono">
                        {preset.category}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/95 sticky bottom-0 z-20 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono hidden sm:block">
            Output: WebP • High Efficiency • {aspectMode.toUpperCase()}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing}
              className="px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? (
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Apply & Save Photo</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
