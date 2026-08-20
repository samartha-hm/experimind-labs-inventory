import { BrowserMultiFormatReader, BarcodeFormat, HTMLCanvasElementLuminanceSource } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

// Monkey patch HTMLCanvasElementLuminanceSource to prevent 'Could not create a Canvas element' bug during 1D barcode rotation
if (typeof window !== 'undefined' && HTMLCanvasElementLuminanceSource) {
  (HTMLCanvasElementLuminanceSource.prototype as any).getTempCanvasElement = function () {
    if (!this.tempCanvasElement) {
      const doc = (this.canvas && this.canvas.ownerDocument) ? this.canvas.ownerDocument : document;
      const tempCanvas = doc.createElement('canvas');
      if (this.canvas) {
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
      }
      this.tempCanvasElement = tempCanvas;
    }
    return this.tempCanvasElement;
  };
}

// Configured hint map for 1D + 2D formats
export function getZXingHints(): Map<DecodeHintType, any> {
  const hints = new Map<DecodeHintType, any>();
  const formats = [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
  ];
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}

/**
 * Creates a singleton BrowserMultiFormatReader instance
 */
let sharedZXingReader: BrowserMultiFormatReader | null = null;
export function getSharedZXingReader(): BrowserMultiFormatReader {
  if (!sharedZXingReader) {
    sharedZXingReader = new BrowserMultiFormatReader(getZXingHints());
  }
  return sharedZXingReader;
}

/**
 * Native BarcodeDetector instance (hardware accelerated when available)
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
 * Decodes a single canvas or image element using hardware BarcodeDetector + ZXing fallback
 */
export async function scanCanvasOrImage(
  source: HTMLCanvasElement | HTMLImageElement | ImageBitmap
): Promise<string | null> {
  // Pass 1: Hardware BarcodeDetector
  const detector = getNativeBarcodeDetector();
  if (detector) {
    try {
      const barcodes = await detector.detect(source);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch (_) {}
  }

  // Pass 2: ZXing Reader
  const reader = getSharedZXingReader();
  try {
    if (source instanceof HTMLCanvasElement) {
      const result = await reader.decodeFromCanvas(source);
      if (result && result.getText()) return result.getText();
    } else if (source instanceof HTMLImageElement) {
      const result = await reader.decodeFromImageElement(source);
      if (result && result.getText()) return result.getText();
    }
  } catch (_) {}

  return null;
}

/**
 * Multi-Pass Super Decoder for Uploaded Barcode Photos / Files
 */
export async function decodeBarcodeFromImageFile(file: File): Promise<string | null> {
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

  // Pass 1: Direct scan on original image element
  const directResult = await scanCanvasOrImage(img);
  if (directResult) return directResult;

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  const maxDim = 1200;
  const scale = Math.min(1, maxDim / Math.max(origW, origH));
  const w = Math.floor(origW * scale);
  const h = Math.floor(origH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);

  // Pass 2: Direct on normalized canvas
  const canvasRes = await scanCanvasOrImage(canvas);
  if (canvasRes) return canvasRes;

  // Pass 3: Grayscale + Dynamic Histogram Contrast Stretch
  try {
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
    const stretchRes = await scanCanvasOrImage(canvas);
    if (stretchRes) return stretchRes;
  } catch (_) {}

  // Pass 4: 90-Degree Rotation
  try {
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = h;
    rotCanvas.height = w;
    const rotCtx = rotCanvas.getContext('2d');
    if (rotCtx) {
      rotCtx.translate(h / 2, w / 2);
      rotCtx.rotate((90 * Math.PI) / 180);
      rotCtx.drawImage(img, -w / 2, -h / 2, w, h);
      const rotRes = await scanCanvasOrImage(rotCanvas);
      if (rotRes) return rotRes;
    }
  } catch (_) {}

  // Pass 5: 270-Degree Rotation
  try {
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = h;
    rotCanvas.height = w;
    const rotCtx = rotCanvas.getContext('2d');
    if (rotCtx) {
      rotCtx.translate(h / 2, w / 2);
      rotCtx.rotate((270 * Math.PI) / 180);
      rotCtx.drawImage(img, -w / 2, -h / 2, w, h);
      const rotRes = await scanCanvasOrImage(rotCanvas);
      if (rotRes) return rotRes;
    }
  } catch (_) {}

  return null;
}
