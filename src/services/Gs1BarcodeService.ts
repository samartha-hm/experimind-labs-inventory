export interface ParsedGs1Barcode {
  gtin?: string;
  lotNumber?: string;
  expiryDate?: string; // YYYY-MM-DD
  serialNumber?: string;
  sscc?: string;
  raw: string;
}

export class Gs1BarcodeService {
  /**
   * Encodes standard GS1-128 string format.
   * e.g. (01)00850012345678(10)LOT2026A(17)261231(21)SN10029
   */
  public static encodeGs1(data: {
    gtin?: string;
    lotNumber?: string;
    expiryDate?: Date | string; // Date or YYMMDD / YYYY-MM-DD
    serialNumber?: string;
    sscc?: string;
  }): string {
    let result = "";

    if (data.gtin) {
      const cleanGtin = data.gtin.replace(/\D/g, "").padStart(14, "0");
      result += `(01)${cleanGtin}`;
    }

    if (data.expiryDate) {
      let formattedExp = "";
      if (data.expiryDate instanceof Date) {
        const yy = String(data.expiryDate.getUTCFullYear()).slice(-2);
        const mm = String(data.expiryDate.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(data.expiryDate.getUTCDate()).padStart(2, "0");
        formattedExp = `${yy}${mm}${dd}`;
      } else {
        const clean = data.expiryDate.replace(/\D/g, "");
        formattedExp = clean.length === 6 ? clean : clean.slice(-6);
      }
      result += `(17)${formattedExp}`;
    }

    if (data.lotNumber) {
      result += `(10)${data.lotNumber.trim()}`;
    }

    if (data.serialNumber) {
      result += `(21)${data.serialNumber.trim()}`;
    }

    if (data.sscc) {
      const cleanSscc = data.sscc.replace(/\D/g, "").padStart(18, "0");
      result += `(00)${cleanSscc}`;
    }

    return result;
  }

  /**
   * Parses scanned composite GS1-128 strings with parenthesized AI prefixes
   */
  public static parseGs1(barcodeStr: string): ParsedGs1Barcode {
    const raw = barcodeStr.trim();
    const result: ParsedGs1Barcode = { raw };

    // Match (01) GTIN (14 digits)
    const gtinMatch = raw.match(/\(01\)(\d{14})/);
    if (gtinMatch) result.gtin = gtinMatch[1];

    // Match (17) Expiration Date (YYMMDD)
    const expMatch = raw.match(/\(17\)(\d{6})/);
    if (expMatch) {
      const yy = parseInt(expMatch[1].slice(0, 2), 10);
      const mm = expMatch[1].slice(2, 4);
      const dd = expMatch[1].slice(4, 6);
      const fullYear = yy < 50 ? 2000 + yy : 1900 + yy;
      result.expiryDate = `${fullYear}-${mm}-${dd}`;
    }

    // Match (10) Batch/Lot (variable length alphanumeric up to next AI or end)
    const lotMatch = raw.match(/\(10\)([^()]+)/);
    if (lotMatch) result.lotNumber = lotMatch[1].trim();

    // Match (21) Serial Number (variable length alphanumeric up to next AI or end)
    const serialMatch = raw.match(/\(21\)([^()]+)/);
    if (serialMatch) result.serialNumber = serialMatch[1].trim();

    // Match (00) SSCC (18 digits)
    const ssccMatch = raw.match(/\(00\)(\d{18})/);
    if (ssccMatch) result.sscc = ssccMatch[1];

    return result;
  }
}
