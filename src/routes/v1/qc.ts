import { Router, Request, Response } from 'express';
import { SerializationService, ProductCode, FLAGSHIP_PRODUCTS } from '../../services/SerializationService.ts';
import { ThermalPrinterService } from '../../services/ThermalPrinterService.ts';

export const qcRouter = Router();

export interface BoardProvisioningPayload {
  kitFamily: ProductCode;
  mcuChipUid: string;
  macAddress: string;
  firmwareVersion: string;
  technicianId: string;
  stationId?: string;
  loopbackTests: {
    i2cBusPassed: boolean;
    spiBusPassed: boolean;
    imuVerified?: boolean;
    motorDriversVerified?: boolean;
  };
}

let sequenceCounter: number = 100;

/**
 * In-memory / database provisioning register
 */
export const provisionedBoardsStore: Map<string, {
  serialNumber: string;
  mcuChipUid: string;
  macAddress: string;
  firmwareVersion: string;
  technicianId: string;
  stationId: string;
  signedToken: string;
  qrVerificationUrl: string;
  timestamp: string;
}> = new Map();

/**
 * POST /api/v1/qc/provision-board
 * Automated bench QC loopback verification and hardware UID pairing
 */
qcRouter.post('/provision-board', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as BoardProvisioningPayload;

    // 1. Validate required fields
    if (!payload.kitFamily || !payload.mcuChipUid || !payload.macAddress || !payload.technicianId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: kitFamily, mcuChipUid, macAddress, and technicianId are mandatory'
      });
      return;
    }

    const code = (payload.kitFamily || 'ANB').toUpperCase();
    const productInfo = FLAGSHIP_PRODUCTS[code] || {
      code,
      name: `${code} Educational Kit`,
      category: 'STEM Kit',
      hsnCode: '9023'
    };

    // 2. Validate loopback tests
    const tests = payload.loopbackTests || { i2cBusPassed: false, spiBusPassed: false };
    if (!tests.i2cBusPassed || !tests.spiBusPassed) {
      res.status(422).json({
        success: false,
        error: 'QC Loopback Verification Failed. Board cannot be provisioned or packaged.',
        details: {
          i2cBusPassed: !!tests.i2cBusPassed,
          spiBusPassed: !!tests.spiBusPassed,
          imuVerified: !!tests.imuVerified,
          motorDriversVerified: !!tests.motorDriversVerified
        }
      });
      return;
    }

    // 3. Generate standardized EXP-[CODE]-26-XXXX serial number
    sequenceCounter += 1;
    const serialNumber = SerializationService.generateSerial(code, sequenceCounter, 26, 4);

    // 4. Pair hardware UID and MAC with serial number
    const pairResult = SerializationService.pairJigDevice({
      serialNumber,
      chipUid: payload.mcuChipUid,
      macAddress: payload.macAddress,
      firmwareVersion: payload.firmwareVersion || '1.0.0',
      qcPassed: true,
      operatorId: payload.technicianId
    });

    // 5. Generate TSPL thermal print markup for retail packaging seal
    const printerService = new ThermalPrinterService();
    const tsplMarkup = printerService.generateRetailSealTspl({
      serialNumber,
      kitName: productInfo.name,
      mcuChipUid: payload.mcuChipUid,
      macAddress: payload.macAddress,
      qrUrl: pairResult.verificationUrl,
      hsnCode: productInfo.hsnCode,
      qcPassedTimestamp: new Date().toISOString().slice(0, 10)
    });

    // 6. Record in registry
    provisionedBoardsStore.set(serialNumber, {
      serialNumber,
      mcuChipUid: payload.mcuChipUid,
      macAddress: payload.macAddress,
      firmwareVersion: payload.firmwareVersion || '1.0.0',
      technicianId: payload.technicianId,
      stationId: payload.stationId || 'BENCH_JIG_01',
      signedToken: pairResult.signature,
      qrVerificationUrl: pairResult.verificationUrl,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Board successfully verified, paired, and provisioned for retail packaging',
      data: {
        serialNumber,
        kitFamily: code,
        kitName: productInfo.name,
        hsnCode: productInfo.hsnCode,
        chipUid: payload.mcuChipUid,
        macAddress: payload.macAddress,
        firmwareVersion: payload.firmwareVersion,
        signedToken: pairResult.signature,
        qrVerificationUrl: pairResult.verificationUrl,
        tsplPrintPayload: tsplMarkup
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Internal error during QC provisioning'
    });
  }
});

/**
 * GET /api/v1/qc/provisioned-boards
 * List recent bench provisioned units
 */
qcRouter.get('/provisioned-boards', (req: Request, res: Response): void => {
  const records = Array.from(provisionedBoardsStore.values());
  res.json({
    success: true,
    count: records.length,
    data: records
  });
});
