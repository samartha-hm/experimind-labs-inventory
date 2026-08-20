import { useEffect } from 'react';

/**
 * Web Audio API synthesizer for crisp scanner chimes
 */
export function playScanBeep(type: 'success' | 'error' | 'click' = 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch (_) {}
}

/**
 * Custom React Hook for hardware USB/HID Barcode Gun Scanners
 * Hardware scanners send fast keypress events (< 50ms interval) terminating with 'Enter'
 */
export function useBarcodeGunListener(onScan: (barcode: string) => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses inside text input elements
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const currentTime = Date.now();

      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          onScan(buffer.trim());
          playScanBeep('success');
        }
        buffer = '';
        return;
      }

      if (e.key.length === 1) {
        if (currentTime - lastKeyTime > 100) {
          buffer = ''; // Reset buffer if typing is too slow to be a barcode scanner
        }
        buffer += e.key;
        lastKeyTime = currentTime;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, enabled]);
}

/**
 * Generates an SVG 1D Barcode pattern (Code 128 / EAN representation)
 */
export function generateBarcodeSVGData(code: string): { width: number; bars: { x: number; width: number }[] } {
  const str = code.toUpperCase().trim() || 'EL-1000';
  
  // Deterministic bar width sequence generator based on code characters
  let bars: { x: number; width: number }[] = [];
  let currentX = 10;
  
  // Quiet zone start
  bars.push({ x: 0, width: 0 });

  // Start pattern
  const pattern = [2, 1, 1, 2, 3, 2];
  for (const w of pattern) {
    bars.push({ x: currentX, width: w * 2 });
    currentX += w * 2 + 1.5;
  }

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const w1 = (charCode % 3) + 1;
    const w2 = ((charCode * 7) % 4) + 1;
    const w3 = ((charCode * 11) % 3) + 1;

    bars.push({ x: currentX, width: w1 * 2 });
    currentX += w1 * 2 + 1.5;
    
    bars.push({ x: currentX, width: w2 * 1.5 });
    currentX += w2 * 1.5 + 1.5;

    bars.push({ x: currentX, width: w3 * 2 });
    currentX += w3 * 2 + 1.5;
  }

  // Stop pattern
  const stopPattern = [2, 3, 3, 1, 1, 1, 2];
  for (const w of stopPattern) {
    bars.push({ x: currentX, width: w * 2 });
    currentX += w * 2 + 1.5;
  }

  return { width: currentX + 10, bars };
}
