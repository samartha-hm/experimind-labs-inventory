import { describe, it, expect } from 'vitest';
import {
  calculateAspectRatioCrop,
  buildCssFilterString,
  DEFAULT_ADJUSTMENTS,
  ImageAdjustments,
} from '../imageStudioHelper';

describe('imageStudioHelper Utilities', () => {
  it('should calculate accurate 1:1 square crop from a landscape image', () => {
    const crop = calculateAspectRatioCrop(1920, 1080, 1.0);
    expect(crop.width).toBe(1080);
    expect(crop.height).toBe(1080);
    expect(crop.x).toBe(420); // (1920 - 1080) / 2
    expect(crop.y).toBe(0);
  });

  it('should calculate accurate 1:1 square crop from a portrait image', () => {
    const crop = calculateAspectRatioCrop(800, 1200, 1.0);
    expect(crop.width).toBe(800);
    expect(crop.height).toBe(800);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(200); // (1200 - 800) / 2
  });

  it('should calculate 16:9 banner crop correctly', () => {
    const crop = calculateAspectRatioCrop(1600, 1600, 16 / 9);
    expect(crop.width).toBe(1600);
    expect(crop.height).toBe(900);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(350);
  });

  it('should return full image dimensions for freeform aspect ratio (null)', () => {
    const crop = calculateAspectRatioCrop(1280, 720, null);
    expect(crop).toEqual({ x: 0, y: 0, width: 1280, height: 720 });
  });

  it('should build accurate CSS filter string with adjustments', () => {
    const adjustments: ImageAdjustments = {
      ...DEFAULT_ADJUSTMENTS,
      brightness: 20,
      contrast: 10,
      saturation: -15,
      grayscale: false,
    };

    const filter = buildCssFilterString(adjustments);
    expect(filter).toContain('brightness(120%)');
    expect(filter).toContain('contrast(110%)');
    expect(filter).toContain('saturate(85%)');
    expect(filter).toContain('grayscale(0%)');
  });

  it('should boost contrast and saturation when autoClarify is enabled', () => {
    const adjustments: ImageAdjustments = {
      ...DEFAULT_ADJUSTMENTS,
      autoClarify: true,
    };

    const filter = buildCssFilterString(adjustments);
    expect(filter).toContain('contrast(125%)');
    expect(filter).toContain('saturate(115%)');
  });

  it('should set grayscale to 100% when grayscale is true', () => {
    const adjustments: ImageAdjustments = {
      ...DEFAULT_ADJUSTMENTS,
      grayscale: true,
    };

    const filter = buildCssFilterString(adjustments);
    expect(filter).toContain('grayscale(100%)');
  });
});
