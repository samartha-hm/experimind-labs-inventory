/**
 * Image Studio & Canvas Transformation Utilities
 * Pure helper functions for in-browser cropping, rotation, filter adjustments, and compression.
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageAdjustments {
  brightness: number; // -50 to +50 (default: 0)
  contrast: number;   // -50 to +50 (default: 0)
  saturation: number; // -50 to +50 (default: 0)
  autoClarify: boolean;
  grayscale: boolean;
  rotation: number;   // 0, 90, 180, 270
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  autoClarify: false,
  grayscale: false,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

/**
 * Calculates clamped crop coordinates keeping a specified aspect ratio.
 */
export function calculateAspectRatioCrop(
  imageWidth: number,
  imageHeight: number,
  targetAspect: number | null // null for freeform
): CropArea {
  if (!targetAspect || targetAspect <= 0) {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight };
  }

  const currentAspect = imageWidth / imageHeight;
  let cropWidth = imageWidth;
  let cropHeight = imageHeight;

  if (currentAspect > targetAspect) {
    cropWidth = imageHeight * targetAspect;
  } else {
    cropHeight = imageWidth / targetAspect;
  }

  const x = Math.max(0, Math.floor((imageWidth - cropWidth) / 2));
  const y = Math.max(0, Math.floor((imageHeight - cropHeight) / 2));

  return {
    x,
    y,
    width: Math.min(imageWidth, Math.floor(cropWidth)),
    height: Math.min(imageHeight, Math.floor(cropHeight)),
  };
}

/**
 * Builds CSS filter string from adjustment properties
 */
export function buildCssFilterString(adjustments: Partial<ImageAdjustments>): string {
  const b = (adjustments.brightness ?? 0) + 100;
  const c = (adjustments.contrast ?? 0) + 100 + (adjustments.autoClarify ? 25 : 0);
  const s = (adjustments.saturation ?? 0) + 100 + (adjustments.autoClarify ? 15 : 0);
  const gray = adjustments.grayscale ? 100 : 0;

  return `brightness(${Math.max(10, b)}%) contrast(${Math.max(10, c)}%) saturate(${Math.max(0, s)}%) grayscale(${gray}%)`;
}

/**
 * Renders cropped and adjusted image onto an HTML5 Canvas and exports as base64 DataURL (WebP/JPEG)
 */
export async function renderProcessedImageToDataUrl(
  imageSrc: string,
  cropArea: CropArea,
  adjustments: ImageAdjustments,
  outputType: 'image/webp' | 'image/jpeg' | 'image/png' = 'image/webp',
  quality: number = 0.92
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const { width: cropW, height: cropH, x: cropX, y: cropY } = cropArea;

        // Determine canvas dimensions after rotation
        const isRotated90or270 = adjustments.rotation === 90 || adjustments.rotation === 270;
        const targetWidth = isRotated90or270 ? cropH : cropW;
        const targetHeight = isRotated90or270 ? cropW : cropH;

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, targetWidth);
        canvas.height = Math.max(1, targetHeight);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to create 2D canvas context'));
          return;
        }

        // Apply Image Filters (Brightness, Contrast, Saturation, Grayscale, Auto-Clarify)
        ctx.filter = buildCssFilterString(adjustments);

        // Setup transformation matrix (translate center -> rotate -> flip -> translate back)
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        if (adjustments.rotation !== 0) {
          ctx.rotate((adjustments.rotation * Math.PI) / 180);
        }

        const scaleX = adjustments.flipHorizontal ? -1 : 1;
        const scaleY = adjustments.flipVertical ? -1 : 1;
        if (scaleX !== 1 || scaleY !== 1) {
          ctx.scale(scaleX, scaleY);
        }

        // Draw the cropped portion of the source image centered
        const drawW = cropW;
        const drawH = cropH;
        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropW,
          cropH,
          -drawW / 2,
          -drawH / 2,
          drawW,
          drawH
        );

        ctx.restore();

        // Export optimized DataURL
        const dataUrl = canvas.toDataURL(outputType, quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      reject(new Error(`Failed to load image for processing: ${err}`));
    };

    img.src = imageSrc;
  });
}

/**
 * Helper to download any image DataURL / URL to user's computer
 */
export function downloadImageFile(dataUrl: string, filename: string = 'stem-item-image.webp') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
