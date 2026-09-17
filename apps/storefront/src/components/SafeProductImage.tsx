'use client';
import React, { useState } from 'react';
import { Box, Sparkles, Compass, Cpu, Layers, Award, Shapes, Orbit } from 'lucide-react';

interface SafeProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  category?: string;
  fallbackIconSize?: number;
}

export default function SafeProductImage({
  src,
  alt,
  className = "w-full h-full object-contain",
  category = "STEM Kits",
  fallbackIconSize = 48,
}: SafeProductImageProps) {
  const [hasError, setHasError] = useState(false);

  // If no source provided or failed to load, render rich SVG STEM illustration
  if (!src || hasError || src.trim() === '') {
    const isMath = (category || '').toLowerCase().includes('math') || (category || '').toLowerCase().includes('geomagic');
    const isRobotics = (category || '').toLowerCase().includes('robot') || (category || '').toLowerCase().includes('iot') || (category || '').toLowerCase().includes('sensor');
    const isPhysics = (category || '').toLowerCase().includes('physic') || (category || '').toLowerCase().includes('optics') || (category || '').toLowerCase().includes('science');

    return (
      <div className="w-full h-full min-h-[140px] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/50 to-cyan-50/40 p-4 text-center select-none relative overflow-hidden rounded-2xl">
        {/* Subtle Background Geometric Dots Pattern */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
        
        {/* Vector Icon Container with Glow */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-white shadow-md border border-indigo-100 flex items-center justify-center text-indigo-600 transition-transform duration-300">
          {isMath ? (
            <Shapes className="w-8 h-8 text-cyan-600 animate-pulse" />
          ) : isRobotics ? (
            <Cpu className="w-8 h-8 text-amber-500" />
          ) : isPhysics ? (
            <Orbit className="w-8 h-8 text-indigo-600" />
          ) : (
            <Sparkles className="w-8 h-8 text-indigo-600" />
          )}
        </div>

        {/* Product Category Tag */}
        <div className="relative z-10 mt-3 text-[10px] font-black uppercase tracking-wider text-indigo-800 bg-indigo-100/90 px-3 py-0.5 rounded-full border border-indigo-200/60 shadow-xs">
          {category || 'ExperiMind STEM'}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "ExperiMind Labs STEM Apparatus"}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}
