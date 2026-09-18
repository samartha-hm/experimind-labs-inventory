import {
  StickerRecord,
  StickerTier,
  StickerStatus,
  ChapterBoxMapping,
  DEFAULT_CHAPTER_BOX_MAPPINGS
} from '../data/stickerDataset';
import { MASTER_PRODUCTION_ITEMS, ProductionItem } from '../data/productionDataset';
import { INITIAL_PROJECTS, Project } from '../data/projectsDataset';

export interface StickerProjectSummary {
  projectId: string;
  totalRequired: number;
  queuedCount: number;
  printedCount: number;
  affixedCount: number;
  overallPrintedPercentage: number;
  overallAffixedPercentage: number;
  tierBreakdown: {
    BOX_CRATE: { total: number; printedCount: number; affixedCount: number; percentage: number };
    ACTIVITY_POUCH: { total: number; printedCount: number; affixedCount: number; percentage: number };
    COMPONENT_ITEM: { total: number; printedCount: number; affixedCount: number; percentage: number };
  };
  boxBreakdown: {
    boxId: string;
    boxNumber: number;
    boxName: string;
    grade: string;
    totalStickers: number;
    printedCount: number;
    affixedCount: number;
    affixedPercentage: number;
  }[];
}

class StickerTrackingServiceClass {
  private stickers: Map<string, StickerRecord> = new Map();
  private boxMappings: ChapterBoxMapping[] = [...DEFAULT_CHAPTER_BOX_MAPPINGS];

  constructor() {
    this.seedDefaultManifests();
  }

  public resetStore(): void {
    this.stickers.clear();
    this.boxMappings = [...DEFAULT_CHAPTER_BOX_MAPPINGS];
  }

  private seedDefaultManifests(): void {
    INITIAL_PROJECTS.forEach(project => {
      this.generateManifestForProject(project.id, 1);
    });
  }

  public getChapterBoxMappings(): ChapterBoxMapping[] {
    return this.boxMappings;
  }

  public updateChapterBoxMappings(mappings: ChapterBoxMapping[]): void {
    this.boxMappings = mappings;
  }

  public generateManifestForProject(projectId: string, batchMultiplier: number = 1): StickerRecord[] {
    const project = INITIAL_PROJECTS.find(p => p.id === projectId) || {
      id: projectId,
      code: projectId,
      name: "Custom Manufacturing Batch"
    };

    const generated: StickerRecord[] = [];
    const sanitizedMultiplier = Math.max(1, Math.min(100, batchMultiplier));

    for (let copy = 1; copy <= sanitizedMultiplier; copy++) {
      // 1. TIER 1: Box / Crate Stickers
      this.boxMappings.forEach(box => {
        const boxStickerId = `STK-${project.code}-BOX-${box.boxId}-C${copy}`;
        const boxSticker: StickerRecord = {
          id: boxStickerId,
          projectId: project.id,
          projectCode: project.code,
          tier: 'BOX_CRATE',
          status: 'QUEUED_TO_PRINT',
          boxId: box.boxId,
          boxNumber: box.boxNumber,
          grade: box.grade,
          labelTitle: box.boxName,
          subtitle: `Batch #${copy} of ${sanitizedMultiplier} • ${project.name}`,
          qrPayload: JSON.stringify({
            tier: 'BOX_CRATE',
            project: project.code,
            boxId: box.boxId,
            copy: copy,
            chapters: box.chapters
          }),
          details: [
            { key: 'Box Number', value: `Box ${box.boxNumber}` },
            { key: 'Grade Level', value: box.grade },
            { key: 'Included Chapters', value: box.chapters.join(', ') },
            { key: 'Target Facility', value: (project as Project).clientName || 'Karnataka STEM Mission' }
          ],
          dimensionsMm: { width: 100, height: 75 },
          batchNumber: copy,
          copyIndex: copy,
          totalCopies: sanitizedMultiplier
        };
        generated.push(boxSticker);
        this.stickers.set(boxSticker.id, boxSticker);
      });

      // 2. TIER 2: Activity Pack / Pouch Stickers
      // Group distinct activities
      const distinctActivities = new Map<string, ProductionItem>();
      MASTER_PRODUCTION_ITEMS.forEach(item => {
        const key = `${item.grade}__${item.chapter}__${item.activityCode}`;
        if (!distinctActivities.has(key)) {
          distinctActivities.set(key, item);
        }
      });

      distinctActivities.forEach((activity, key) => {
        const matchingBox = this.findMatchingBox(activity.grade, activity.chapter);
        const pouchStickerId = `STK-${project.code}-ACT-${activity.activityCode}-C${copy}`;
        
        const pouchSticker: StickerRecord = {
          id: pouchStickerId,
          projectId: project.id,
          projectCode: project.code,
          tier: 'ACTIVITY_POUCH',
          status: 'QUEUED_TO_PRINT',
          boxId: matchingBox?.boxId,
          boxNumber: matchingBox?.boxNumber,
          grade: activity.grade,
          chapter: activity.chapter,
          activityCode: activity.activityCode,
          activityName: activity.activityName,
          labelTitle: `Activity ${activity.activityCode}: ${activity.activityName}`,
          subtitle: `${activity.grade} • Chapter ${activity.chapter} • ${activity.pouchCategory.replace('_', ' ')}`,
          qrPayload: JSON.stringify({
            tier: 'ACTIVITY_POUCH',
            project: project.code,
            activityCode: activity.activityCode,
            pouchCategory: activity.pouchCategory,
            copy: copy
          }),
          details: [
            { key: 'Activity Code', value: activity.activityCode },
            { key: 'Pouch Color', value: activity.pouchCategory },
            { key: 'Destination Box', value: matchingBox ? `Box ${matchingBox.boxNumber}` : 'Universal Crate' },
            { key: 'Prep Protocol', value: activity.prepSpecification || 'Standard Assembly' }
          ],
          hazardBadges: activity.chemicalSpecs?.hazardLevel ? [activity.chemicalSpecs.hazardLevel] : undefined,
          dimensionsMm: { width: 70, height: 40 },
          batchNumber: copy,
          copyIndex: copy,
          totalCopies: sanitizedMultiplier
        };
        generated.push(pouchSticker);
        this.stickers.set(pouchSticker.id, pouchSticker);
      });

      // 3. TIER 3: Component / Vial / Item Stickers
      MASTER_PRODUCTION_ITEMS.forEach(item => {
        const matchingBox = this.findMatchingBox(item.grade, item.chapter);
        const itemStickerId = `STK-${project.code}-ITM-${item.id}-C${copy}`;

        const itemSticker: StickerRecord = {
          id: itemStickerId,
          projectId: project.id,
          projectCode: project.code,
          tier: 'COMPONENT_ITEM',
          status: 'QUEUED_TO_PRINT',
          boxId: matchingBox?.boxId,
          boxNumber: matchingBox?.boxNumber,
          grade: item.grade,
          chapter: item.chapter,
          activityCode: item.activityCode,
          activityName: item.activityName,
          itemId: item.id,
          itemName: item.materialName,
          labelTitle: item.materialName,
          subtitle: `${item.grade} • ${item.sourcingType} • Bin: ${item.warehouseBin}`,
          qrPayload: JSON.stringify({
            tier: 'COMPONENT_ITEM',
            project: project.code,
            itemId: item.id,
            sourcingType: item.sourcingType,
            bin: item.warehouseBin,
            copy: copy
          }),
          details: [
            { key: 'Part Code', value: item.id },
            { key: 'Quantity/Kit', value: `${item.quantityPerKit} ${item.unit}` },
            { key: 'Warehouse Bin', value: item.warehouseBin },
            { key: 'Sourcing Channel', value: item.sourcingType }
          ],
          hazardBadges: item.chemicalSpecs?.hazardLevel ? [item.chemicalSpecs.hazardLevel] : undefined,
          dimensionsMm: { width: 50, height: 25 },
          batchNumber: copy,
          copyIndex: copy,
          totalCopies: sanitizedMultiplier
        };
        generated.push(itemSticker);
        this.stickers.set(itemSticker.id, itemSticker);
      });
    }

    return generated;
  }

  private findMatchingBox(grade: string, chapter: string): ChapterBoxMapping | undefined {
    return this.boxMappings.find(box => {
      if (box.grade !== grade && box.grade !== 'Common & Universal') return false;
      return box.chapters.includes(chapter) || box.chapters.includes('CRATE_COMMON') || box.chapters.includes('CRATE_UNIVERSAL');
    });
  }

  public getAllStickers(): StickerRecord[] {
    return Array.from(this.stickers.values());
  }

  public getStickersByProject(projectId: string): StickerRecord[] {
    return Array.from(this.stickers.values()).filter(s => s.projectId === projectId || s.projectCode === projectId);
  }

  public updateStickerStatus(
    id: string,
    status: StickerStatus,
    user: { id: string; name: string },
    verificationNotes?: string
  ): StickerRecord {
    const existing = this.stickers.get(id);
    if (!existing) {
      throw new Error(`Sticker with ID ${id} not found.`);
    }

    const now = new Date().toISOString();
    const updated: StickerRecord = { ...existing, status };

    if (status === 'PRINTED') {
      updated.printedAt = now;
      updated.printedByUserId = user.id;
      updated.printedByUserName = user.name;
    } else if (status === 'AFFIXED_AND_VERIFIED') {
      if (!updated.printedAt) {
        updated.printedAt = now;
        updated.printedByUserId = user.id;
        updated.printedByUserName = user.name;
      }
      updated.affixedAt = now;
      updated.affixedByUserId = user.id;
      updated.affixedByUserName = user.name;
      if (verificationNotes) {
        updated.verificationNotes = verificationNotes;
      }
    }

    this.stickers.set(id, updated);
    return updated;
  }

  public batchUpdateStatus(
    ids: string[],
    status: StickerStatus,
    user: { id: string; name: string },
    verificationNotes?: string
  ): { updatedCount: number; updatedIds: string[] } {
    let count = 0;
    const updatedIds: string[] = [];

    ids.forEach(id => {
      if (this.stickers.has(id)) {
        this.updateStickerStatus(id, status, user, verificationNotes);
        count++;
        updatedIds.push(id);
      }
    });

    return { updatedCount: count, updatedIds };
  }

  public getStickerSummary(projectId?: string): StickerProjectSummary {
    const stickers = projectId ? this.getStickersByProject(projectId) : this.getAllStickers();
    const total = stickers.length;
    const queuedCount = stickers.filter(s => s.status === 'QUEUED_TO_PRINT').length;
    const printedCount = stickers.filter(s => s.status === 'PRINTED' || s.status === 'AFFIXED_AND_VERIFIED').length;
    const affixedCount = stickers.filter(s => s.status === 'AFFIXED_AND_VERIFIED').length;

    const tiers: StickerTier[] = ['BOX_CRATE', 'ACTIVITY_POUCH', 'COMPONENT_ITEM'];
    const tierBreakdown = {
      BOX_CRATE: { total: 0, printedCount: 0, affixedCount: 0, percentage: 0 },
      ACTIVITY_POUCH: { total: 0, printedCount: 0, affixedCount: 0, percentage: 0 },
      COMPONENT_ITEM: { total: 0, printedCount: 0, affixedCount: 0, percentage: 0 }
    };

    tiers.forEach(tier => {
      const tierStickers = stickers.filter(s => s.tier === tier);
      const tTotal = tierStickers.length;
      const tPrinted = tierStickers.filter(s => s.status === 'PRINTED' || s.status === 'AFFIXED_AND_VERIFIED').length;
      const tAffixed = tierStickers.filter(s => s.status === 'AFFIXED_AND_VERIFIED').length;
      tierBreakdown[tier] = {
        total: tTotal,
        printedCount: tPrinted,
        affixedCount: tAffixed,
        percentage: tTotal > 0 ? Math.round((tAffixed / tTotal) * 100) : 0
      };
    });

    const boxBreakdown = this.boxMappings.map(box => {
      const boxStickers = stickers.filter(s => s.boxId === box.boxId);
      const bTotal = boxStickers.length;
      const bPrinted = boxStickers.filter(s => s.status === 'PRINTED' || s.status === 'AFFIXED_AND_VERIFIED').length;
      const bAffixed = boxStickers.filter(s => s.status === 'AFFIXED_AND_VERIFIED').length;

      return {
        boxId: box.boxId,
        boxNumber: box.boxNumber,
        boxName: box.boxName,
        grade: box.grade,
        totalStickers: bTotal,
        printedCount: bPrinted,
        affixedCount: bAffixed,
        affixedPercentage: bTotal > 0 ? Math.round((bAffixed / bTotal) * 100) : 0
      };
    });

    return {
      projectId: projectId || 'ALL_PROJECTS',
      totalRequired: total,
      queuedCount,
      printedCount,
      affixedCount,
      overallPrintedPercentage: total > 0 ? Math.round((printedCount / total) * 100) : 0,
      overallAffixedPercentage: total > 0 ? Math.round((affixedCount / total) * 100) : 0,
      tierBreakdown,
      boxBreakdown
    };
  }
}

export const StickerTrackingService = new StickerTrackingServiceClass();
