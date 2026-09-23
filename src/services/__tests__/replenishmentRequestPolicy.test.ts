import { describe, expect, it } from "vitest";
import { getReplenishmentRequestStatus } from "../replenishmentRequestPolicy";

describe("replenishment request policy", () => {
  it("keeps Project Staff submissions in draft/request state", () => {
    expect(getReplenishmentRequestStatus("project_staff", "approved")).toBe("draft");
    expect(getReplenishmentRequestStatus("project_staff", "sent")).toBe("draft");
  });

  it("preserves requested status for operational roles", () => {
    expect(getReplenishmentRequestStatus("inventory_staff", "sent")).toBe("sent");
    expect(getReplenishmentRequestStatus("admin", "approved")).toBe("approved");
  });
});
