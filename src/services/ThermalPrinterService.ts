/**
 * Direct WebSerial Hardware I/O Service
 * Top 1% Engineering Execution for Experimind Labs
 * 
 * Bypasses OS print dialogs to stream raw TSPL / ZPL commands directly
 * to thermal label printers over the WebSerial API (9600 baud).
 * Integrates precision digital counting scales for bulk hardware pieces.
 */

export interface BinLabelPayload {
  ipn: string;
  name: string;
  value?: string;
  bin: string;
  qrUrl?: string;
  isEsdSafe?: boolean;
}

export interface RetailPackagingSealPayload {
  serialNumber: string;
  kitName: string;
  mcuChipUid?: string;
  macAddress?: string;
  qrUrl: string;
  hsnCode?: string;
  qcPassedTimestamp?: string;
}

export interface CountingScaleReading {
  rawPacket: string;
  netWeightGrams: number;
  isStable: boolean;
  unitWeightGrams: number;
  calculatedPieceCount: number;
}

export class ThermalPrinterService {
  private port: any = null;
  private writer: any = null;

  /**
   * Request user permission and open serial connection to thermal printer
   */
  async connect(baudRate: number = 9600): Promise<boolean> {
    if (typeof navigator === 'undefined' || !(navigator as any).serial) {
      throw new Error('WebSerial API is not supported in this browser. Please use Chrome/Edge on desktop.');
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate });
      return true;
    } catch (err: any) {
      throw new Error(`Failed to establish WebSerial printer connection: ${err.message}`);
    }
  }

  /**
   * Close active serial port connection
   */
  async disconnect(): Promise<void> {
    if (this.writer) {
      try {
        this.writer.releaseLock();
      } catch (_) {}
      this.writer = null;
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch (_) {}
      this.port = null;
    }
  }

  /**
   * Directly dispenses a 50mm x 25mm TSPL component drawer / bin label
   */
  async printBinLabel(item: BinLabelPayload): Promise<string> {
    const tspl = this.generateBinLabelTspl(item);
    await this.sendRawStream(tspl);
    return tspl;
  }

  /**
   * Directly dispenses a 100mm x 60mm TSPL retail packaging QC seal
   */
  async printRetailPackagingSeal(kit: RetailPackagingSealPayload): Promise<string> {
    const tspl = this.generateRetailSealTspl(kit);
    await this.sendRawStream(tspl);
    return tspl;
  }

  /**
   * Generates TSPL markup for 50x25mm component bin label
   */
  generateBinLabelTspl(item: BinLabelPayload): string {
    const cleanIpn = (item.ipn || '').replace(/"/g, '');
    const cleanName = (item.name || '').slice(0, 24).replace(/"/g, '');
    const cleanVal = (item.value || '').slice(0, 20).replace(/"/g, '');
    const cleanBin = (item.bin || '').replace(/"/g, '');
    const esdFlag = item.isEsdSafe ? ' [ESD SAFE]' : '';

    return [
      'SIZE 50 mm, 25 mm',
      'GAP 2 mm, 0 mm',
      'DIRECTION 1',
      'CLS',
      `TEXT 20,15,"3",0,1,1,"${cleanIpn}${esdFlag}"`,
      `TEXT 20,48,"2",0,1,1,"${cleanName}"`,
      cleanVal ? `TEXT 20,78,"2",0,1,1,"Val: ${cleanVal}"` : '',
      `TEXT 20,105,"2",0,1,1,"Bin: ${cleanBin}"`,
      `BARCODE 260,18,"128",36,1,0,2,2,"${cleanIpn}"`,
      'PRINT 1,1',
      ''
    ].filter(Boolean).join('\r\n');
  }

  /**
   * Generates TSPL markup for 100x60mm retail kit packaging seal with QR verification
   */
  generateRetailSealTspl(kit: RetailPackagingSealPayload): string {
    const cleanSerial = (kit.serialNumber || '').replace(/"/g, '');
    const cleanKit = (kit.kitName || '').slice(0, 32).replace(/"/g, '');
    const cleanMac = kit.macAddress ? `MAC: ${kit.macAddress.replace(/"/g, '')}` : '';
    const cleanHsn = kit.hsnCode ? `HSN: ${kit.hsnCode}` : 'HSN: 9023';
    const qrUrl = kit.qrUrl || `https://shop.experimindlabs.com/verify?sn=${cleanSerial}`;
    const timestamp = kit.qcPassedTimestamp || new Date().toISOString().slice(0, 10);

    return [
      'SIZE 100 mm, 60 mm',
      'GAP 3 mm, 0 mm',
      'DIRECTION 1',
      'CLS',
      'BOX 10,10,790,470,3',
      `TEXT 30,30,"4",0,1,1,"EXPERIMIND LABS - QC CERTIFIED"`,
      `TEXT 30,75,"3",0,1,1,"${cleanKit}"`,
      `TEXT 30,120,"3",0,1,1,"SN: ${cleanSerial}"`,
      cleanMac ? `TEXT 30,165,"2",0,1,1,"${cleanMac}"` : '',
      `TEXT 30,200,"2",0,1,1,"${cleanHsn} | Certified: ${timestamp}"`,
      `BARCODE 30,240,"128",60,1,0,2,3,"${cleanSerial}"`,
      `QRCODE 580,240,L,5,A,0,"${qrUrl}"`,
      `TEXT 560,420,"1",0,1,1,"Scan to Authenticate"`,
      'PRINT 1,1',
      ''
    ].filter(Boolean).join('\r\n');
  }

  private async sendRawStream(payload: string): Promise<void> {
    if (!this.port) {
      await this.connect();
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    this.writer = this.port.writable.getWriter();
    await this.writer.write(data);
    this.writer.releaseLock();
    this.writer = null;
  }
}

/**
 * Precision Digital Counting Scale WebSerial Connector
 * Parses standard industrial counting scale RS-232 / USB ASCII formats
 */
export class WebSerialCountingScaleService {
  private port: any = null;
  private reader: any = null;

  async connect(baudRate: number = 9600): Promise<boolean> {
    if (typeof navigator === 'undefined' || !(navigator as any).serial) {
      throw new Error('WebSerial API is not supported in this browser');
    }
    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate });
      return true;
    } catch (err: any) {
      throw new Error(`Failed to connect to counting scale: ${err.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.reader) {
      try {
        await this.reader.cancel();
        this.reader.releaseLock();
      } catch (_) {}
      this.reader = null;
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch (_) {}
      this.port = null;
    }
  }

  /**
   * Parses standard scale weight packets (e.g. "ST,GS,+  124.50g", "WN: 124.5g", "124.50")
   */
  parseWeightPacket(packet: string, unitWeightGrams: number = 1.0): CountingScaleReading {
    const clean = packet.trim();
    const isStable = clean.startsWith('ST') || !clean.includes('US');

    // Extract numeric weight using regex
    const match = clean.match(/([+-]?\s*\d+(\.\d+)?)/);
    let netWeight = 0;
    if (match) {
      netWeight = parseFloat(match[1].replace(/\s+/g, ''));
    }

    const calculatedCount = unitWeightGrams > 0 ? Math.round(netWeight / unitWeightGrams) : 0;

    return {
      rawPacket: packet,
      netWeightGrams: netWeight,
      isStable,
      unitWeightGrams,
      calculatedPieceCount: Math.max(0, calculatedCount)
    };
  }
}
