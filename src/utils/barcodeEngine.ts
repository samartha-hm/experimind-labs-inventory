import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

// Shared hints configured for maximum sensitivity and try_harder mode
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
 * Creates a configured BrowserMultiFormatReader with high-frequency scanning
 */
export function createZXingReader(): BrowserMultiFormatReader {
  return new BrowserMultiFormatReader(getZXingHints(), {
    delayBetweenScanAttempts: 80,
    delayBetweenScanSuccess: 500,
  });
}

/**
 * Multi-Pass Super Decoder for Uploaded Barcode Images
 * Applies automated contrast adjustment, grayscale, thresholding, and rotation passes
 */
export async function decodeBarcodeFromImageFile(file: File): Promise<string | null> {
  // Step 1: Load image into an HTMLImageElement
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

  const zxing = createZXingReader();

  // Pass 1: Direct decode from original image
  try {
    const res = await zxing.decodeFromImageElement(img);
    if (res && res.getText()) return res.getText();
  } catch (_) {}

  // Helper to create and process canvas
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // Normalize scale for optimal 1D line detection (width ~ 1000px)
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

  // Pass 2: Grayscale & Contrast Stretched Pass
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    
    // Find min and max luminance for histogram stretching
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

    const res = await zxing.decodeFromCanvas(canvas);
    if (res && res.getText()) return res.getText();
  } catch (_) {}

  // Pass 3: High-contrast Binary Thresholding Pass
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = data[i] < 128 ? 0 : 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    const res = await zxing.decodeFromCanvas(canvas);
    if (res && res.getText()) return res.getText();
  } catch (_) {}

  // Pass 4: 90-Degree Rotation Pass (for vertical barcodes)
  try {
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = h;
    rotCanvas.height = w;
    const rotCtx = rotCanvas.getContext('2d');
    if (rotCtx) {
      rotCtx.translate(h / 2, w / 2);
      rotCtx.rotate((90 * Math.PI) / 180);
      rotCtx.drawImage(img, -w / 2, -h / 2, w, h);

      const res = await zxing.decodeFromCanvas(rotCanvas);
      if (res && res.getText()) return res.getText();
    }
  } catch (_) {}

  // Pass 5: 270-Degree Rotation Pass
  try {
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = h;
    rotCanvas.height = w;
    const rotCtx = rotCanvas.getContext('2d');
    if (rotCtx) {
      rotCtx.translate(h / 2, w / 2);
      rotCtx.rotate((270 * Math.PI) / 180);
      rotCtx.drawImage(img, -w / 2, -h / 2, w, h);

      const res = await zxing.decodeFromCanvas(rotCanvas);
      if (res && res.getText()) return res.getText();
    }
  } catch (_) {}

  return null;
}
