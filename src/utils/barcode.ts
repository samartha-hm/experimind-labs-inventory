import { useEffect } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * Web Audio API synthesizer for crisp scanner chimes with haptic feedback
 */
export function playScanBeep(type: 'success' | 'match' | 'warning' | 'error' | 'click' = 'success') {
  try {
    // Haptic feedback on supported devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'success') navigator.vibrate?.(40);
      else if (type === 'match') navigator.vibrate?.([40, 30, 60]);
      else if (type === 'error' || type === 'warning') navigator.vibrate?.([80, 50, 80]);
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 note
      osc.frequency.exponentialRampToValueAtTime(2093, ctx.currentTime + 0.08); // C7 note
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'match') {
      // Harmonic pleasant chord
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.06); // D6
      osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.12); // A6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'warning') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
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
