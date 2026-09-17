import { useEffect } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * Web Audio API synthesizer for crisp scanner chimes with haptic feedback
 */
export function playScanBeep(type: 'success' | 'match' | 'warning' | 'error' | 'click' = 'success') {
  try {
    // Haptic feedback on supported devices (Experimind Floor Ergonomics Standard)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'success') navigator.vibrate?.(45);
      else if (type === 'match') navigator.vibrate?.([40, 30, 60]);
      else if (type === 'error' || type === 'warning') navigator.vibrate?.([100, 50, 100]); // 180Hz double buzz haptic
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // 1200 Hz high-precision success chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'match') {
      // Harmonic pleasant chord
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.06); // 1200 Hz
      osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.12); // A6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'warning') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(360, ctx.currentTime);
      osc.frequency.setValueAtTime(240, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === 'error') {
      // 180 Hz mismatch buzz with double vibration
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
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
      // Ignore keypresses inside editable text input elements
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
 * Generates an SVG 1D Barcode pattern (Code 128 standard compliant)
 */
export function generateBarcodeSVGData(code: string): { width: number; bars: { x: number; width: number }[] } {
  const cleanCode = code.trim() || 'EL-1';
  
  if (typeof document !== 'undefined') {
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svg, cleanCode, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: false,
        margin: 2,
      });

      const rects = svg.querySelectorAll('rect');
      const bars: { x: number; width: number }[] = [];
      rects.forEach((rect) => {
        const x = parseFloat(rect.getAttribute('x') || '0');
        const width = parseFloat(rect.getAttribute('width') || '2');
        const fill = rect.getAttribute('fill');
        if (fill && fill !== '#ffffff' && fill !== 'white' && fill !== 'transparent') {
          bars.push({ x, width });
        }
      });

      const viewBox = svg.getAttribute('viewBox') || '0 0 100 40';
      const parts = viewBox.split(' ');
      const totalWidth = parts.length === 4 ? parseFloat(parts[2]) : 120;

      return { width: totalWidth, bars };
    } catch (_) {}
  }

  return { width: 120, bars: [] };
}
