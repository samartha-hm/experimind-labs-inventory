import { describe, it, expect, beforeEach } from 'vitest';
import { StickerTrackingService } from '../StickerTrackingService';
import { DEFAULT_CHAPTER_BOX_MAPPINGS } from '../../data/stickerDataset';

describe('StickerTrackingService', () => {
  beforeEach(() => {
    StickerTrackingService.resetStore();
  });

  it('generates a complete 3-tier manifest for a project', () => {
    const stickers = StickerTrackingService.generateManifestForProject('PRJ-001', 1);
    expect(stickers.length).toBeGreaterThan(50);

    const boxStickers = stickers.filter(s => s.tier === 'BOX_CRATE');
    const pouchStickers = stickers.filter(s => s.tier === 'ACTIVITY_POUCH');
    const itemStickers = stickers.filter(s => s.tier === 'COMPONENT_ITEM');

    expect(boxStickers.length).toBeGreaterThanOrEqual(DEFAULT_CHAPTER_BOX_MAPPINGS.length);
    expect(pouchStickers.length).toBeGreaterThan(20);
    expect(itemStickers.length).toBeGreaterThan(50);

    // Initial status should all be QUEUED_TO_PRINT
    expect(stickers.every(s => s.status === 'QUEUED_TO_PRINT')).toBe(true);
  });

  it('correctly maps chapters to boxes in generated stickers', () => {
    const stickers = StickerTrackingService.generateManifestForProject('PRJ-001', 1);
    const box1 = stickers.find(s => s.tier === 'BOX_CRATE' && s.boxId === 'BOX-G8-01');
    expect(box1).toBeDefined();
    expect(box1?.grade).toBe('Grade 8');
    expect(box1?.details.some(d => d.key === 'Included Chapters')).toBe(true);
  });

  it('scales total sticker counts with batch multiplier', () => {
    const batch1 = StickerTrackingService.generateManifestForProject('PRJ-001', 1);
    StickerTrackingService.resetStore();
    const batch5 = StickerTrackingService.generateManifestForProject('PRJ-001', 5);

    expect(batch5.length).toBe(batch1.length * 5);
  });

  it('transitions individual sticker status with operator attribution', () => {
    const stickers = StickerTrackingService.generateManifestForProject('PRJ-001', 1);
    const target = stickers[0];

    // Mark Printed
    const printed = StickerTrackingService.updateStickerStatus(target.id, 'PRINTED', {
      id: 'usr-tech-01',
      name: 'Ravi Kumar'
    });
    expect(printed.status).toBe('PRINTED');
    expect(printed.printedByUserName).toBe('Ravi Kumar');
    expect(printed.printedAt).toBeDefined();

    // Mark Affixed
    const affixed = StickerTrackingService.updateStickerStatus(target.id, 'AFFIXED_AND_VERIFIED', {
      id: 'usr-qa-02',
      name: 'Priya Sharma'
    }, 'Placed on 50ml Amber Vial #14');
    expect(affixed.status).toBe('AFFIXED_AND_VERIFIED');
    expect(affixed.affixedByUserName).toBe('Priya Sharma');
    expect(affixed.verificationNotes).toContain('Amber Vial');
  });

  it('supports bulk batch state transitions', () => {
    const stickers = StickerTrackingService.generateManifestForProject('PRJ-001', 1);
    const firstTenIds = stickers.slice(0, 10).map(s => s.id);

    const result = StickerTrackingService.batchUpdateStatus(firstTenIds, 'PRINTED', {
      id: 'usr-lead-01',
      name: 'Dr. Samartha'
    });

    expect(result.updatedCount).toBe(10);
    const summary = StickerTrackingService.getStickerSummary('PRJ-001');
    expect(summary.printedCount).toBe(10);
    expect(summary.affixedCount).toBe(0);
  });

  it('calculates comprehensive completion metrics across tiers and boxes', () => {
    const stickers = StickerTrackingService.generateManifestForProject('PRJ-001', 1);
    const boxStickers = stickers.filter(s => s.tier === 'BOX_CRATE');
    
    // Print all box stickers and affix one
    StickerTrackingService.batchUpdateStatus(boxStickers.map(b => b.id), 'PRINTED', {
      id: 'usr-01',
      name: 'Tester'
    });
    StickerTrackingService.updateStickerStatus(boxStickers[0].id, 'AFFIXED_AND_VERIFIED', {
      id: 'usr-01',
      name: 'Tester'
    });

    const summary = StickerTrackingService.getStickerSummary('PRJ-001');
    expect(summary.tierBreakdown.BOX_CRATE.printedCount).toBe(boxStickers.length);
    expect(summary.tierBreakdown.BOX_CRATE.affixedCount).toBe(1);
    expect(summary.boxBreakdown.length).toBeGreaterThan(0);
    expect(summary.overallAffixedPercentage).toBeGreaterThanOrEqual(0);
  });
});
