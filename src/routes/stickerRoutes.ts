import { Router, Request, Response } from 'express';
import { StickerTrackingService } from '../services/StickerTrackingService';
import { StickerStatus, StickerTier } from '../data/stickerDataset';

const router = Router();

// GET /api/v1/stickers
router.get('/', (req: Request, res: Response) => {
  try {
    const { projectId, tier, status, boxId, search } = req.query;
    let list = projectId ? StickerTrackingService.getStickersByProject(String(projectId)) : StickerTrackingService.getAllStickers();

    if (tier) {
      list = list.filter(s => s.tier === String(tier) as StickerTier);
    }
    if (status) {
      list = list.filter(s => s.status === String(status) as StickerStatus);
    }
    if (boxId) {
      list = list.filter(s => s.boxId === String(boxId));
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(s =>
        s.labelTitle.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        (s.activityCode && s.activityCode.toLowerCase().includes(q)) ||
        (s.itemName && s.itemName.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: list.length, stickers: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/stickers/summary
router.get('/summary', (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const summary = StickerTrackingService.getStickerSummary(projectId ? String(projectId) : undefined);
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/stickers/mappings
router.get('/mappings', (req: Request, res: Response) => {
  try {
    const mappings = StickerTrackingService.getChapterBoxMappings();
    res.json({ success: true, mappings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/stickers/generate
router.post('/generate', (req: Request, res: Response) => {
  try {
    const { projectId, batchMultiplier } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required' });
    }
    const manifest = StickerTrackingService.generateManifestForProject(projectId, Number(batchMultiplier || 1));
    res.status(201).json({ success: true, count: manifest.length, stickers: manifest });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/stickers/:id/status
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, user, verificationNotes } = req.body;
    if (!status || !user) {
      return res.status(400).json({ success: false, error: 'status and user are required' });
    }

    const updated = StickerTrackingService.updateStickerStatus(id, status, user, verificationNotes);
    res.json({ success: true, sticker: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/stickers/batch-status
router.post('/batch-status', (req: Request, res: Response) => {
  try {
    const { ids, status, user, verificationNotes } = req.body;
    if (!ids || !Array.isArray(ids) || !status || !user) {
      return res.status(400).json({ success: false, error: 'ids array, status, and user are required' });
    }

    const result = StickerTrackingService.batchUpdateStatus(ids, status, user, verificationNotes);
    res.json({ success: true, updatedCount: result.updatedCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
