import React, { useState } from 'react';

interface ItemImageProps {
  src?: string;
  alt?: string;
  className?: string;
  category?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

function getCategoryIcon(category?: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('glass') || cat.includes('beaker') || cat.includes('flask') || cat.includes('bottle')) return '🧪';
  if (cat.includes('chem') || cat.includes('reagent') || cat.includes('acid') || cat.includes('solvent')) return '⚗️';
  if (cat.includes('elect') || cat.includes('board') || cat.includes('sensor') || cat.includes('wire')) return '⚡';
  if (cat.includes('tool') || cat.includes('hardware') || cat.includes('screw') || cat.includes('wrench')) return '🔧';
  if (cat.includes('bio') || cat.includes('specimen') || cat.includes('dish') || cat.includes('pipette')) return '🧬';
  if (cat.includes('device') || cat.includes('meter') || cat.includes('microscope') || cat.includes('scope')) return '🔬';
  if (cat.includes('safety') || cat.includes('glove') || cat.includes('goggle') || cat.includes('mask')) return '🥽';
  return '📦';
}

export function transformDriveUrl(url?: string): string | undefined {
  if (!url) return undefined;
  
  // Extract Google Drive ID if present
  const driveMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    const driveId = driveMatch[1];
    // Route via local proxy for high-reliability streaming and caching
    return `/api/v1/image-proxy?driveId=${driveId}&originalUrl=${encodeURIComponent(url)}`;
  }
  
  return url;
}

export default function ItemImage({
  src,
  alt = 'Inventory Asset',
  className = 'w-full h-full object-cover',
  category,
  size = 'md',
}: ItemImageProps) {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const transformedSrc = transformDriveUrl(src);
  const icon = getCategoryIcon(category);

  if (!transformedSrc || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl select-none ${className}`}
        title={alt}
      >
        <span className="text-xl filter drop-shadow opacity-90">{icon}</span>
        {size === 'lg' && (
          <span className="text-[10px] text-slate-400 font-medium mt-1 truncate px-2 text-center">
            {category || 'Item Asset'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 animate-pulse">
          <span className="text-sm opacity-50">{icon}</span>
        </div>
      )}
      <img
        src={transformedSrc}
        alt={alt}
        loading="lazy"
        crossOrigin="anonymous"
        onLoad={() => setLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
