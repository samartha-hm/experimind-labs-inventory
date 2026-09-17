import { describe, it, expect } from 'vitest';
import { qcRouter, provisionedBoardsStore } from '../../routes/v1/qc.ts';

function createMockReqRes(body: any = {}) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = { body };
  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    }
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => responseData
  };
}

// Find route handler in router stack
function getPostHandler() {
  const layer = qcRouter.stack.find(
    (l: any) => l.route && l.route.path === '/provision-board' && l.route.methods.post
  );
  return layer.route.stack[0].handle;
}

describe('Automated Bench QC & Silicon UID Provisioning Pipeline', () => {
  const handler = getPostHandler();

  it('rejects boards with missing mandatory fields', async () => {
    const { req, res, getStatus, getData } = createMockReqRes({ kitFamily: 'ANB' });
    await handler(req, res, (() => {}) as any);

    expect(getStatus()).toBe(400);
    expect(getData().success).toBe(false);
  });

  it('rejects boards failing I2C or SPI loopback tests with HTTP 422', async () => {
    const { req, res, getStatus, getData } = createMockReqRes({
      kitFamily: 'ANB',
      mcuChipUid: 'ESP32-D0WD-Q6-0x49A28B',
      macAddress: '24:6F:28:1A:3B:5C',
      firmwareVersion: 'v2.1.0-anubhav',
      technicianId: 'TECH-NITTE-04',
      loopbackTests: {
        i2cBusPassed: false,
        spiBusPassed: true,
        imuVerified: false
      }
    });
    await handler(req, res, (() => {}) as any);

    expect(getStatus()).toBe(422);
    expect(getData().success).toBe(false);
    expect(getData().error).toContain('Loopback Verification Failed');
  });

  it('successfully provisions board, generates EXP-[FAMILY]-26-XXXX serial and TSPL label when loopback passes', async () => {
    const { req, res, getStatus, getData } = createMockReqRes({
      kitFamily: 'ANB',
      mcuChipUid: 'ESP32-D0WD-Q6-0x49A28B',
      macAddress: '24:6F:28:1A:3B:5C',
      firmwareVersion: 'v2.1.0-anubhav',
      technicianId: 'TECH-NITTE-04',
      stationId: 'BENCH_JIG_02',
      loopbackTests: {
        i2cBusPassed: true,
        spiBusPassed: true,
        imuVerified: true,
        motorDriversVerified: true
      }
    });
    await handler(req, res, (() => {}) as any);

    expect(getStatus()).toBe(201);
    expect(getData().success).toBe(true);
    expect(getData().data.serialNumber).toMatch(/^EXP-ANB-26-\d{4}$/);
    expect(getData().data.kitName).toBe('Anubhav Kits (Robotics & AI, STEM Explorer)');
    expect(getData().data.hsnCode).toBe('9023');
    expect(getData().data.signedToken).toBeDefined();
    expect(getData().data.qrVerificationUrl).toContain('https://inventory.experimindlabs.com/verify?sn=');
    expect(getData().data.tsplPrintPayload).toContain('SIZE 100 mm, 60 mm');
    expect(getData().data.tsplPrintPayload).toContain('QRCODE');

    // Verify stored
    expect(provisionedBoardsStore.has(getData().data.serialNumber)).toBe(true);
  });
});
