import { describe, expect, it } from "vitest";
import { validateReservationQuantity, validateReservationTtl } from "../cartReservationPolicy";

describe("cart reservation policy", () => {
  it("rejects zero, negative, and non-finite quantities", () => {
    expect(() => validateReservationQuantity(0)).toThrow();
    expect(() => validateReservationQuantity(-1)).toThrow();
    expect(() => validateReservationQuantity(Number.NaN)).toThrow();
  });

  it("caps reservation TTL to one day", () => {
    expect(validateReservationTtl(15)).toBe(15);
    expect(() => validateReservationTtl(24 * 60 + 1)).toThrow();
  });
});
