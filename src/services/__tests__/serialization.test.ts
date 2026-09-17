import { describe, it, expect } from "vitest";
import {
  SerializationService,
  FLAGSHIP_PRODUCTS,
} from "../SerializationService.ts";

describe("SerializationService — Experimind Labs Standard (EXP-[CODE]-26-XXXX)", () => {
  describe("Flagship Products Registry", () => {
    it("registers all 5 flagship products with correct codes and HSN 9023", () => {
      expect(FLAGSHIP_PRODUCTS.PSL.code).toBe("PSL");
      expect(FLAGSHIP_PRODUCTS.PRA.code).toBe("PRA");
      expect(FLAGSHIP_PRODUCTS.ANB.code).toBe("ANB");
      expect(FLAGSHIP_PRODUCTS.GEO.code).toBe("GEO");
      expect(FLAGSHIP_PRODUCTS.SHK.code).toBe("SHK");

      // Educational / demo kit standard HSN code
      expect(FLAGSHIP_PRODUCTS.PSL.hsnCode).toBe("9023");
      expect(FLAGSHIP_PRODUCTS.ANB.hsnCode).toBe("9023");
    });
  });

  describe("Validation & Parsing", () => {
    it("validates correct Experimind serial codes", () => {
      expect(SerializationService.isValidSerial("EXP-ANB-26-0001")).toBe(true);
      expect(SerializationService.isValidSerial("EXP-PSL-26-0042")).toBe(true);
      expect(SerializationService.isValidSerial("EXP-PRA-26-1000")).toBe(true);
      expect(SerializationService.isValidSerial("EXP-GEO-26-0005")).toBe(true);
      expect(SerializationService.isValidSerial("EXP-SHK-26-0123")).toBe(true);
    });

    it("rejects invalid or malformed serial numbers", () => {
      expect(SerializationService.isValidSerial("")).toBe(false);
      expect(SerializationService.isValidSerial("EXP-AN-26-0001")).toBe(false); // 2 letters
      expect(SerializationService.isValidSerial("EXP-ANB-26-1")).toBe(false); // only 1 digit seq
      expect(SerializationService.isValidSerial("INVALID-123")).toBe(false);
      expect(SerializationService.isValidSerial("EXP-ANB-2026-0001")).toBe(false); // 4-digit year instead of 2
    });

    it("parses valid serial into component tokens", () => {
      const parsed = SerializationService.parseSerial("EXP-ANB-26-0042");
      expect(parsed.valid).toBe(true);
      expect(parsed.prefix).toBe("EXP");
      expect(parsed.productCode).toBe("ANB");
      expect(parsed.year).toBe(26);
      expect(parsed.sequenceNumber).toBe(42);
    });

    it("returns valid:false on failed parsing with descriptive error", () => {
      const parsed = SerializationService.parseSerial("FOOBAR");
      expect(parsed.valid).toBe(false);
      expect(parsed.error).toBeDefined();
    });
  });

  describe("Generation", () => {
    it("generates 4-digit padded serials for year 26", () => {
      const s1 = SerializationService.generateSerial("ANB", 1, 26);
      expect(s1).toBe("EXP-ANB-26-0001");

      const s2 = SerializationService.generateSerial("PSL", 42, 26);
      expect(s2).toBe("EXP-PSL-26-0042");

      const s3 = SerializationService.generateSerial("SHK", 9999, 26);
      expect(s3).toBe("EXP-SHK-26-9999");
    });

    it("throws error if product code is not 3 characters", () => {
      expect(() => SerializationService.generateSerial("TOOLONG", 1)).toThrow();
      expect(() => SerializationService.generateSerial("AB", 1)).toThrow();
    });
  });

  describe("MAC Address Normalization", () => {
    it("normalizes 12-char hex string to colon-separated MAC", () => {
      expect(SerializationService.normalizeMac("AABBCCDDEEFF")).toBe("AA:BB:CC:DD:EE:FF");
      expect(SerializationService.normalizeMac("aa-bb-cc-dd-ee-ff")).toBe("AA:BB:CC:DD:EE:FF");
      expect(SerializationService.normalizeMac("aa:bb:cc:dd:ee:ff")).toBe("AA:BB:CC:DD:EE:FF");
    });
  });

  describe("Jig Telemetry & Cryptographic Verification", () => {
    const serial = "EXP-ANB-26-0001";
    const chipUid = "ESP32-E8A1F3C482";
    const mac = "24:6F:28:B1:A2:3C";

    it("generates deterministic 16-char HMAC signature", () => {
      const sig1 = SerializationService.generateSignature(serial, chipUid, mac);
      const sig2 = SerializationService.generateSignature(serial, chipUid, mac);
      expect(sig1).toBe(sig2);
      expect(sig1.length).toBe(16);
    });

    it("verifies matching signatures and rejects tampered values", () => {
      const sig = SerializationService.generateSignature(serial, chipUid, mac);
      expect(SerializationService.verifySignature(serial, sig, chipUid, mac)).toBe(true);

      // Tampered MAC
      expect(SerializationService.verifySignature(serial, sig, chipUid, "00:11:22:33:44:55")).toBe(false);

      // Tampered Serial
      expect(SerializationService.verifySignature("EXP-ANB-26-0002", sig, chipUid, mac)).toBe(false);
    });

    it("creates full jig pairing package with ZPL and TSPL label printing strings", () => {
      const result = SerializationService.pairJigDevice({
        serialNumber: serial,
        chipUid,
        macAddress: mac,
        qcPassed: true,
        operatorId: "USER-TECH-01",
      });

      expect(result.serialNumber).toBe(serial);
      expect(result.verificationUrl).toContain("https://inventory.experimindlabs.com/verify?sn=EXP-ANB-26-0001");
      expect(result.verificationUrl).toContain("&sig=");
      expect(result.zplString).toContain("^XA");
      expect(result.zplString).toContain("^XZ");
      expect(result.zplString).toContain("EXP-ANB-26-0001");
      expect(result.zplString).toContain("QC: PASSED");

      expect(result.tsplString).toContain("SIZE 50 mm, 30 mm");
      expect(result.tsplString).toContain("EXP-ANB-26-0001");
      expect(result.tsplString).toContain("PRINT 1,1");
    });
  });
});
