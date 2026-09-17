import { describe, it, expect } from "vitest";
import { ForecastService } from "../ForecastService.ts";

describe("ForecastService (Dynamic Reorder Point & Velocity Forecasting)", () => {
  it("calculates daily velocity and dynamic reorder point correctly for high-velocity items", () => {
    // 300 units consumed in 30 days = 10 units / day
    // 7 days lead time -> lead time demand = 70 units
    // With safety stock buffer, dynamic reorder point should be > static threshold
    const result = ForecastService.computeItemForecast({
      itemId: "item-microcontroller",
      sku: "MCU-ESP32-WROOM",
      name: "ESP32 WiFi/BLE Module",
      currentStock: 50,
      staticThreshold: 10,
      consumed30Days: 300,
      leadTimeDays: 7,
      serviceLevelZ: 1.65,
    });

    expect(result.dailyVelocity).toBe(10);
    expect(result.leadTimeDemand).toBe(70);
    expect(result.safetyStock).toBeGreaterThan(15);
    expect(result.dynamicReorderPoint).toBeGreaterThan(85);

    // Current stock is 50 <= dynamicReorderPoint (85+), so it should recommend reorder
    expect(result.urgency).toBe("REORDER_RECOMMENDED");
    expect(result.suggestedOrderQty).toBeGreaterThan(100);
    expect(result.runoutDaysEstimate).toBe(5); // 50 / 10 = 5 days until stockout
  });

  it("classifies out of stock item with CRITICAL or OUT_OF_STOCK urgency", () => {
    const result = ForecastService.computeItemForecast({
      itemId: "item-empty",
      sku: "RES-10K-0805",
      name: "10k Ohm 0805 Resistor",
      currentStock: 0,
      staticThreshold: 50,
      consumed30Days: 600,
      leadTimeDays: 5,
    });

    expect(result.currentStock).toBe(0);
    expect(result.urgency).toBe("OUT_OF_STOCK");
    expect(result.suggestedOrderQty).toBeGreaterThan(0);
    expect(result.runoutDaysEstimate).toBe(0);
  });

  it("classifies well-stocked low-velocity item as HEALTHY", () => {
    // Consumed 15 units in 30 days = 0.5 units / day
    // 500 in stock
    const result = ForecastService.computeItemForecast({
      itemId: "item-rare",
      sku: "TOOL-HEATGUN-PRO",
      name: "Industrial Heat Gun",
      currentStock: 500,
      staticThreshold: 5,
      consumed30Days: 15,
      leadTimeDays: 7,
    });

    expect(result.dailyVelocity).toBe(0.5);
    expect(result.urgency).toBe("HEALTHY");
    expect(result.suggestedOrderQty).toBe(0);
    expect(result.runoutDaysEstimate).toBe(1000);
  });

  it("handles zero consumption gracefully without division by zero", () => {
    const result = ForecastService.computeItemForecast({
      itemId: "item-dormant",
      sku: "DORMANT-01",
      name: "Dormant Part",
      currentStock: 20,
      staticThreshold: 5,
      consumed30Days: 0,
    });

    expect(result.dailyVelocity).toBe(0);
    expect(result.runoutDaysEstimate).toBeNull();
    expect(result.urgency).toBe("HEALTHY");
  });
});
