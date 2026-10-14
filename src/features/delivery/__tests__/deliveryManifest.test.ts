import { describe, expect, it } from "vitest";
import { deliveryManifestPDF } from "../deliveryManifest";
import type { DeliveryOrder } from "../deliveryTypes";

function order(): DeliveryOrder {
  return {
    id: "order-1", organization_id: "tenant-1", project_id: "project-1", site_id: "school-1", packing_order_id: "packing-1",
    number: "DO-synthetic", revision: 4, status: "partially_delivered",
    manifest: Array.from({ length: 50 }, (_, i) => ({ id: `package-${i}`, parent_id: null, code: `PK-package-${i}`, kind: "crate", name: "Science crate", pack_number: i + 1, selection_id: "selection-1", version_id: "version-1", version_number: 2, subject: "Science", grade: "8", definition_id: "definition-1", activity_ids: [], inventory_item_ids: [], materials: [] })),
    transport: { carrier: "Synthetic carrier", vehicle: "Synthetic vehicle", planned_date: "2026-10-14", notes: "Handle carefully" },
    destination: { project_name: "Synthetic project", school_name: "Synthetic School A", address: "Synthetic campus" },
    execution: { proofs: [{ id: "proof-1", package_ids: ["package-0"], recipient: "Synthetic recipient", acknowledged_at: "2026-10-14T10:00:00Z", acknowledgement: "Received", recorded_by: "actor-1", recorded_at: "2026-10-14T10:00:00Z" }], issues: [{ id: "issue-1", package_id: "package-1", kind: "damaged", notes: "Crate damaged", reported_by: "actor-1", reported_at: "2026-10-14T10:00:00Z", correction: "Crate repaired" }] },
    created_by: "actor-1", updated_by: "actor-1", created_at: "2026-10-14T10:00:00Z", updated_at: "2026-10-14T10:00:00Z",
  };
}
describe("Persisted delivery manifest PDF", () => {
  it("prints identity, version, receipt and corrected issue without mutating persisted data on reprint", () => {
    const value = order(), original = JSON.stringify(value);
    for (let i = 0; i < 2; i++) {
      const pdf = deliveryManifestPDF(value), output = pdf.output();
      expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
      for (const text of ["DO-synthetic", "Synthetic School A", "PK-package-49", "version-1", "Received", "Synthetic recipient", "Crate repaired"]) expect(output).toContain(text);
      expect(JSON.stringify(value)).toBe(original);
    }
  });
});
