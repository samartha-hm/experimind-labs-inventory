import { describe, it, expect } from "vitest";
import { CreateInventoryDto, UpdateInventoryDto } from "../../routes/v1/inventory.ts";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

describe("Hardware & Electronics Component Parameters Tests", () => {
  it("validates and permits hardware parameters on CreateInventoryDto", async () => {
    const validData = {
      sku: "ESP32-WROOM-32E-01",
      name: "ESP32-WROOM-32E Wi-Fi & BLE Module",
      category: "Microcontrollers",
      base_price: 280,
      quantity: 100,
      mpn: "ESP32-WROOM-32E",
      manufacturer: "Espressif Systems",
      package_footprint: "MODULE-38",
      mounting_type: "SMD",
      msl_rating: "MSL 3",
      datasheet_url: "https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32e_datasheet_en.pdf",
    };

    const instance = plainToInstance(CreateInventoryDto, validData);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBe(0);
    expect(instance.mpn).toBe("ESP32-WROOM-32E");
    expect(instance.package_footprint).toBe("MODULE-38");
    expect(instance.mounting_type).toBe("SMD");
    expect(instance.msl_rating).toBe("MSL 3");
  });

  it("validates and permits hardware parameters on UpdateInventoryDto", async () => {
    const updateData = {
      mpn: "STM32F401CCU6",
      manufacturer: "STMicroelectronics",
      package_footprint: "UFQFPN-48",
      mounting_type: "SMD",
      msl_rating: "MSL 3",
    };

    const instance = plainToInstance(UpdateInventoryDto, updateData);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBe(0);
    expect(instance.mpn).toBe("STM32F401CCU6");
    expect(instance.package_footprint).toBe("UFQFPN-48");
    expect(instance.mounting_type).toBe("SMD");
    expect(instance.msl_rating).toBe("MSL 3");
  });

  it("rejects non-whitelisted arbitrary attributes", async () => {
    const invalidData = {
      name: "Test Component",
      unsupportedField: "Malicious payload",
    };

    const instance = plainToInstance(UpdateInventoryDto, invalidData);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBeGreaterThan(0);
  });
});
