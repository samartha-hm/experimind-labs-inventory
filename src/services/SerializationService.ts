import crypto from "crypto";
import { AppDataSource } from "../db.ts";
import { SerialNumber } from "../entity/SerialNumber.ts";

export type ProductCode = "PSL" | "PRA" | "ANB" | "GEO" | "SHK" | string;

export interface FlagshipProductInfo {
  code: string;
  name: string;
  category: string;
  hsnCode: string;
}

export const FLAGSHIP_PRODUCTS: Record<string, FlagshipProductInfo> = {
  PSL: {
    code: "PSL",
    name: "Portable STEM Lab (PSL)",
    category: "Composite Kit",
    hsnCode: "9023",
  },
  PRA: {
    code: "PRA",
    name: "Prastuti Demonstration Kits (Grades 8-10 NCERT)",
    category: "Educational Demonstration Kit",
    hsnCode: "9023",
  },
  ANB: {
    code: "ANB",
    name: "Anubhav Kits (Robotics & AI, STEM Explorer)",
    category: "Robotics & AI Learning Kit",
    hsnCode: "9023",
  },
  GEO: {
    code: "GEO",
    name: "Geo-Magic Kits",
    category: "STEM Educational Kit",
    hsnCode: "9023",
  },
  SHK: {
    code: "SHK",
    name: "Shiksha Robot",
    category: "Educational Robotics",
    hsnCode: "9023",
  },
};

export interface ParsedSerial {
  raw: string;
  valid: boolean;
  prefix?: string;
  productCode?: string;
  year?: number;
  sequenceNumber?: number;
  error?: string;
}

export interface JigPairingPayload {
  serialNumber: string;
  chipUid?: string;
  macAddress?: string;
  firmwareVersion?: string;
  qcPassed: boolean;
  operatorId?: string;
  timestamp?: string;
}

export interface SignedQrPayload {
  serialNumber: string;
  chipUid?: string;
  macAddress?: string;
  signature: string;
  verificationUrl: string;
  zplString: string;
  tsplString: string;
}

export class SerializationService {
  private static readonly SERIAL_REGEX = /^EXP-([A-Z]{3})-(\d{2})-(\d{4,})$/;

  /**
   * Validate if a string conforms to the EXP-[CODE]-YY-XXXX serialization standard
   */
  public static isValidSerial(serial: string): boolean {
    if (!serial || typeof serial !== "string") return false;
    return this.SERIAL_REGEX.test(serial.trim().toUpperCase());
  }

  /**
   * Parse a serial number into its component parts
   */
  public static parseSerial(serial: string): ParsedSerial {
    if (!serial || typeof serial !== "string") {
      return { raw: serial, valid: false, error: "Empty or invalid serial format" };
    }

    const clean = serial.trim().toUpperCase();
    const match = clean.match(this.SERIAL_REGEX);

    if (!match) {
      return {
        raw: clean,
        valid: false,
        error: "Does not match pattern EXP-[CODE]-[YY]-[SEQUENCE] (e.g. EXP-ANB-26-0001)",
      };
    }

    const productCode = match[1];
    const year = parseInt(match[2], 10);
    const sequenceNumber = parseInt(match[3], 10);

    return {
      raw: clean,
      valid: true,
      prefix: "EXP",
      productCode,
      year,
      sequenceNumber,
    };
  }

  /**
   * Generate a standardized serial number string
   * @param productCode 3-letter product code (e.g. PSL, PRA, ANB, GEO, SHK)
   * @param sequenceNumber Integer sequence number >= 1
   * @param year 2-digit year (default: 26)
   * @param padding Minimum digits for sequence (default: 4)
   */
  public static generateSerial(
    productCode: ProductCode,
    sequenceNumber: number,
    year: number = 26,
    padding: number = 4
  ): string {
    const cleanCode = (productCode || "ANB").trim().toUpperCase();
    if (cleanCode.length !== 3) {
      throw new Error(`Product code must be exactly 3 uppercase letters, got '${cleanCode}'`);
    }
    if (sequenceNumber < 0) {
      throw new Error("Sequence number must be non-negative");
    }

    const yearStr = String(year).padStart(2, "0").slice(-2);
    const seqStr = String(sequenceNumber).padStart(padding, "0");
    return `EXP-${cleanCode}-${yearStr}-${seqStr}`;
  }

  /**
   * Normalizes MAC address to standard colon-separated format
   */
  public static normalizeMac(mac?: string): string | undefined {
    if (!mac) return undefined;
    const clean = mac.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
    if (clean.length !== 12) return mac.trim();
    return clean.match(/.{1,2}/g)?.join(":") || mac;
  }

  /**
   * Generates a cryptographic verification signature for device pairing
   */
  public static generateSignature(
    serialNumber: string,
    chipUid?: string,
    macAddress?: string,
    secretKey: string = "experimind-labs-jig-secret-2026"
  ): string {
    const payload = [
      serialNumber.trim().toUpperCase(),
      (chipUid || "").trim().toUpperCase(),
      (macAddress || "").trim().toUpperCase(),
    ].join("|");

    return crypto.createHmac("sha256", secretKey).update(payload).digest("hex").slice(0, 16);
  }

  /**
   * Verify signature authenticity
   */
  public static verifySignature(
    serialNumber: string,
    signature: string,
    chipUid?: string,
    macAddress?: string,
    secretKey: string = "experimind-labs-jig-secret-2026"
  ): boolean {
    const expected = this.generateSignature(serialNumber, chipUid, macAddress, secretKey);
    return expected.toLowerCase() === (signature || "").trim().toLowerCase();
  }

  /**
   * Pair programming jig telemetry with Serial QR & generate thermal label print formats (ZPL / TSPL)
   */
  public static pairJigDevice(payload: JigPairingPayload): SignedQrPayload {
    const { serialNumber, chipUid, macAddress, qcPassed } = payload;

    if (!this.isValidSerial(serialNumber)) {
      throw new Error(`Invalid serial number format: ${serialNumber}`);
    }

    const normMac = this.normalizeMac(macAddress);
    const signature = this.generateSignature(serialNumber, chipUid, normMac);
    const verificationUrl = `https://inventory.experimindlabs.com/verify?sn=${encodeURIComponent(
      serialNumber
    )}&sig=${signature}`;

    // ZPL (Zebra Programming Language) 50x30mm thermal label
    const zplString = [
      "^XA",
      "^FO30,30^BQN,2,4^FDQA," + verificationUrl + "^FS",
      "^FO160,30^ADN,18,10^FDExperimind Labs^FS",
      `^FO160,60^ADN,22,12^FD${serialNumber}^FS`,
      chipUid ? `^FO160,95^ADN,14,8^FDUID: ${chipUid}^FS` : "",
      normMac ? `^FO160,115^ADN,14,8^FDMAC: ${normMac}^FS` : "",
      `^FO160,140^ADN,14,8^FDQC: ${qcPassed ? "PASSED" : "FAILED"} [SIG:${signature.slice(0, 8)}]^FS`,
      "^XZ",
    ]
      .filter(Boolean)
      .join("\n");

    // TSPL (TSC Thermal Printer Language)
    const tsplString = [
      "SIZE 50 mm, 30 mm",
      "GAP 2 mm, 0 mm",
      "DIRECTION 1",
      "CLS",
      `QRCODE 30,30,L,4,A,0,"${verificationUrl}"`,
      'TEXT 160,30,"3",0,1,1,"Experimind Labs"',
      `TEXT 160,65,"3",0,1,1,"${serialNumber}"`,
      chipUid ? `TEXT 160,105,"2",0,1,1,"UID: ${chipUid}"` : "",
      normMac ? `TEXT 160,130,"2",0,1,1,"MAC: ${normMac}"` : "",
      `TEXT 160,155,"2",0,1,1,"QC: ${qcPassed ? "PASSED" : "FAILED"}"`,
      "PRINT 1,1",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      serialNumber,
      chipUid,
      macAddress: normMac,
      signature,
      verificationUrl,
      zplString,
      tsplString,
    };
  }

  /**
   * Look up the next available sequence number from the database for a product code and year
   */
  public static async getNextSequenceNumber(
    productCode: ProductCode,
    year: number = 26,
    organizationId: string = "00000000-0000-0000-0000-000000000000"
  ): Promise<number> {
    const cleanCode = productCode.toUpperCase();
    const prefix = `EXP-${cleanCode}-${String(year).padStart(2, "0")}-`;

    const repo = AppDataSource.getRepository(SerialNumber);
    const lastSerial = await repo
      .createQueryBuilder("serial")
      .where("serial.organizationId = :orgId AND serial.serialNumber LIKE :prefix", {
        orgId: organizationId,
        prefix: `${prefix}%`,
      })
      .orderBy("serial.serialNumber", "DESC")
      .getOne();

    if (!lastSerial) return 1;

    const parsed = this.parseSerial(lastSerial.serialNumber);
    if (parsed.valid && parsed.sequenceNumber) {
      return parsed.sequenceNumber + 1;
    }
    return 1;
  }
}
