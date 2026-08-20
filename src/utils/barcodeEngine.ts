import {
  readBarcodesFromImageData,
  readBarcodesFromImageFile,
  ReaderOptions,
  BarcodeFormat
} from 'zxing-wasm';

/**
 * Standard reader configuration with aggressive multi-pass decoding
 */
const DEFAULT_DECODE_OPTIONS: ReaderOptions = {
  formats: [
    'Code128',
    'Code39',
    'EAN-13',
    'EAN-8',
    'UPC-A',
    'UPC-E',
    'QRCode',
    'DataMatrix',
    'ITF',
    'Codabar'
  ],
  tryHarder: true,
  tryRotate: true,
  tryInvert: true,
  tryDownscale: true,
  tryDenoise: true,
  tryCode39ExtendedMode: true,
  binarizer: 'LocalAverage',
  maxNumberOfSymbols: 5,
};

/**
 * Native Hardware BarcodeDetector instance (GPU-accelerated when available)
 */
let nativeDetector: any = null;
function getNativeBarcodeDetector() {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    if (!nativeDetector) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: [
            'code_128',
            'code_39',
            'ean_13',
            'ean_8',
            'upc_a',
            'upc_e',
            'qr_code',
            'data_matrix',
            'itf',
            'codabar',
          ],
        });
      } catch (_) {
        nativeDetector = null;
      }
    }
    return nativeDetector;
  }
  return null;
}

/**
 * Decodes a single canvas or image element using Tier-1 Hardware BarcodeDetector + Tier-2 WASM ZXing-C++
 */
export async function scanCanvasOrImage(
  source: HTMLCanvasElement | HTMLImageElement | ImageBitmap
): Promise<string | null> {
  // Tier 1: Hardware BarcodeDetector (0ms latency native GPU path)
  const detector = getNativeBarcodeDetector();
  if (detector) {
    try {
      const barcodes = await detector.detect(source);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch (_) {
      // Fall through to WASM
    }
  }

  // Tier 2: WASM ZXing-C++ Engine (Multi-rotation, inverted, sub-pixel edge detection)
  try {
    let imgData: ImageData | null = null;

    if (source instanceof HTMLCanvasElement) {
      const ctx = source.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        imgData = ctx.getImageData(0, 0, source.width, source.height);
      }
    } else if (source instanceof HTMLImageElement) {
      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth || source.width;
      canvas.height = source.naturalHeight || source.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(source, 0, 0);
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    }

    if (imgData) {
      const results = await readBarcodesFromImageData(imgData, DEFAULT_DECODE_OPTIONS);
      if (results && results.length > 0 && results[0].text) {
        return results[0].text.trim();
      }
    }
  } catch (_) {
    // Silent catch
  }

  return null;
}

/**
 * Super Decoder for Uploaded Barcode Images / Photos
 */
export async function decodeBarcodeFromImageFile(file: File): Promise<string | null> {
  // Pass 1: Direct WebAssembly ZXing-C++ on file blob
  try {
    const wasmResults = await readBarcodesFromImageFile(file, DEFAULT_DECODE_OPTIONS);
    if (wasmResults && wasmResults.length > 0 && wasmResults[0].text) {
      return wasmResults[0].text.trim();
    }
  } catch (_) {
    // Continue to DOM-based pass
  }

  // Pass 2: Direct image element decode with Hardware BarcodeDetector
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await scanCanvasOrImage(img);
    if (res) return res;

    // Pass 3: Scaled and Contrast-Enhanced Canvas
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(origW, origH));
    const w = Math.floor(origW * scale);
    const h = Math.floor(origH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    let minLum = 255;
    let maxLum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }
    const range = Math.max(1, maxLum - minLum);
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const stretched = Math.min(255, Math.max(0, ((lum - minLum) / range) * 255));
      data[i] = stretched;
      data[i + 1] = stretched;
      data[i + 2] = stretched;
    }
    ctx.putImageData(imgData, 0, 0);

    const enhancedResults = await readBarcodesFromImageData(imgData, DEFAULT_DECODE_OPTIONS);
    if (enhancedResults && enhancedResults.length > 0 && enhancedResults[0].text) {
      return enhancedResults[0].text.trim();
    }
  } catch (_) {}

  return null;
}
