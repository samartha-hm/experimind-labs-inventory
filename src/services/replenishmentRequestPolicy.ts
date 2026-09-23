import { CoreRole } from "../middleware/requireRole.ts";

export type PurchaseOrderRequestStatus = "draft" | "sent" | "approved" | "received" | "cancelled";

export function getReplenishmentRequestStatus(
  role: CoreRole | null,
  requestedStatus?: PurchaseOrderRequestStatus,
): PurchaseOrderRequestStatus {
  if (role === "project_staff") return "draft";
  return requestedStatus || "draft";
}
