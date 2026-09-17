import {
  readBarcodesFromImageData,
  readBarcodesFromImageFile,
  ReaderOptions
} from 'zxing-wasm';

/**
 * Ultra-fast reader options for live camera stream and manual viewport snapshots (<25ms execution)
 */
const FAST_STREAM_DECODE_OPTIONS: ReaderOptions = {
  tryHarder: false,
  tryRotate: false,
  tryInvert: false,
  tryDownscale: false,
  tryCode39ExtendedMode: true,
  binarizer: 'LocalAverage',
  maxNumberOfSymbols: 1,
};

/**
 * Secondary retry options for difficult or inverted barcodes in live view
 */
const RETRY_STREAM_DECODE_OPTIONS: ReaderOptions = {
  tryHarder: true,
  tryRotate: false,
  tryInvert: true,
  tryDownscale: false,
  tryCode39ExtendedMode: true,
  binarizer: 'LocalAverage',
  maxNumberOfSymbols: 1,
};

/**
 * Standard reader configuration with aggressive multi-pass decoding for static files/photos
 */
const DEFAULT_DECODE_OPTIONS: ReaderOptions = {
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
 * Decodes a single canvas or image element using Tier-1 Hardware BarcodeDetector + Tier-2 Fast WASM ZXing-C++
 */
export async function scanCanvasOrImage(
  source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
  isDeep: boolean = false
): Promise<string | null> {
  const srcW = (source as any).width || (source as any).naturalWidth || 480;
  const srcH = (source as any).height || (source as any).naturalHeight || 280;
  const centerX = srcW / 2;
  const centerY = srcH / 2;

  // Tier 1: Hardware BarcodeDetector (0ms latency native GPU path with center proximity matching)
  const detector = getNativeBarcodeDetector();
  if (detector) {
    try {
      const barcodes = await detector.detect(source);
      if (barcodes && barcodes.length > 0) {
        let bestBarcode = barcodes[0];
        let minDistanceSq = Infinity;

        for (const b of barcodes) {
          if (!b.rawValue) continue;
          if (b.boundingBox) {
            const bx = b.boundingBox.x + b.boundingBox.width / 2;
            const by = b.boundingBox.y + b.boundingBox.height / 2;
            const distSq = (bx - centerX) ** 2 + (by - centerY) ** 2;
            if (distSq < minDistanceSq) {
              minDistanceSq = distSq;
              bestBarcode = b;
            }
          } else {
            bestBarcode = b;
            break;
          }
        }
        if (bestBarcode?.rawValue) {
          return bestBarcode.rawValue.trim();
        }
      }
    } catch (_) {
      // Fall through to WASM
    }
  }

  // Tier 2: WASM ZXing-C++ Engine
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
      const pickClosestResult = (results: any[]): string | null => {
        if (!results || results.length === 0) return null;
        let bestText = results[0].text;
        let minDistanceSq = Infinity;

        for (const r of results) {
          if (!r.text) continue;
          if (r.position) {
            const px = (r.position.topLeft.x + r.position.topRight.x + r.position.bottomLeft.x + r.position.bottomRight.x) / 4;
            const py = (r.position.topLeft.y + r.position.topRight.y + r.position.bottomLeft.y + r.position.bottomRight.y) / 4;
            const distSq = (px - centerX) ** 2 + (py - centerY) ** 2;
            if (distSq < minDistanceSq) {
              minDistanceSq = distSq;
              bestText = r.text;
            }
          } else {
            return r.text.trim();
          }
        }
        return bestText ? bestText.trim() : null;
      };

      // Step 1: Ultra-fast single symbol pass
      const options = isDeep ? RETRY_STREAM_DECODE_OPTIONS : FAST_STREAM_DECODE_OPTIONS;
      const results = await Promise.race([
        readBarcodesFromImageData(imgData, options),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 300))
      ]);
      
      const chosen = pickClosestResult(results as any);
      if (chosen) return chosen;

      // Step 2: If deep/manual scan and fast pass failed, try retry options
      if (isDeep) {
        const retryResults = await Promise.race([
          readBarcodesFromImageData(imgData, RETRY_STREAM_DECODE_OPTIONS),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 400))
        ]);
        const retryChosen = pickClosestResult(retryResults as any);
        if (retryChosen) return retryChosen;
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
  } catch (err) {
    console.warn('WASM direct blob read note:', err);
  }

  // Pass 2: Load into HTMLImageElement
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

    // Hardware detector pass
    const hwRes = await scanCanvasOrImage(img);
    if (hwRes) return hwRes;

    // Pass 3: Multi-Resolution & Contrast Stretches
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    const scales = [1.0, 0.75, 0.5, 1.5];
    for (const scale of scales) {
      const w = Math.floor(origW * scale);
      const h = Math.floor(origH * scale);
      if (w < 50 || h < 50 || w > 3000 || h > 3000) continue;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);

      // Attempt standard scale
      const res = await readBarcodesFromImageData(imgData, DEFAULT_DECODE_OPTIONS);
      if (res && res.length > 0 && res[0].text) {
        return res[0].text.trim();
      }

      // Dynamic Contrast Stretch
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

      const stretchRes = await readBarcodesFromImageData(imgData, DEFAULT_DECODE_OPTIONS);
      if (stretchRes && stretchRes.length > 0 && stretchRes[0].text) {
        return stretchRes[0].text.trim();
      }
    }

    // Pass 4: 90° & 270° Canvas Rotations
    for (const angle of [90, 270]) {
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = origH;
      rotCanvas.height = origW;
      const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
      if (rotCtx) {
        rotCtx.translate(origH / 2, origW / 2);
        rotCtx.rotate((angle * Math.PI) / 180);
        rotCtx.drawImage(img, -origW / 2, -origH / 2);

        const rotImgData = rotCtx.getImageData(0, 0, origH, origW);
        const rotRes = await readBarcodesFromImageData(rotImgData, DEFAULT_DECODE_OPTIONS);
        if (rotRes && rotRes.length > 0 && rotRes[0].text) {
          return rotRes[0].text.trim();
        }
      }
    }
  } catch (err) {
    console.warn('Image file decode pass exception:', err);
  }

  return null;
}
