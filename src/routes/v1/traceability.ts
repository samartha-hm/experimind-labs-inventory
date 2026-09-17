import { Router, Request, Response } from 'express';
import { TraceabilityService } from '../../services/TraceabilityService.ts';

export const traceabilityRouter = Router();

/**
 * GET /api/v1/traceability/forward
 * Forward recall trace: given lot or MPN, finds all kits and orders containing it
 */
traceabilityRouter.get('/forward', (req: Request, res: Response): void => {
  const lot = (req.query.lot as string) || (req.query.mpn as string);
  if (!lot) {
    res.status(400).json({
      success: false,
      error: 'Query parameter "lot" or "mpn" is required'
    });
    return;
  }

  const result = TraceabilityService.forwardTrace(lot);
  res.json({
    success: true,
    data: result
  });
});

/**
 * GET /api/v1/traceability/backward
 * Backward pedigree trace: given kit serial, finds silicon UID, MAC, and component origins
 */
traceabilityRouter.get('/backward', (req: Request, res: Response): void => {
  const serial = req.query.serial as string;
  if (!serial) {
    res.status(400).json({
      success: false,
      error: 'Query parameter "serial" is required'
    });
    return;
  }

  const result = TraceabilityService.backwardTrace(serial);
  res.json({
    success: true,
    data: result
  });
});
