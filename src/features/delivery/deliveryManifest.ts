import { jsPDF } from "jspdf";
import type { DeliveryOrder } from "./deliveryTypes";
/** Read-only rendering of the persisted manifest; never allocates packages or inventory. */
export function deliveryManifestPDF(order: DeliveryOrder) {
  const pdf = new jsPDF(); let y = 16;
  const line = (text: string) => {
    for (const part of pdf.splitTextToSize(text, 180) as string[]) {
      if (y > 280) { pdf.addPage(); y = 16; } pdf.text(part, 15, y); y += 6;
    }
  };
  pdf.setFontSize(11);
  line(`Delivery note ${order.number} | revision ${order.revision} | ${order.status}`);
  line(`${order.destination.project_name} / ${order.destination.school_name}`); line(order.destination.address);
  line(`Carrier: ${order.transport.carrier} | Vehicle: ${order.transport.vehicle} | Planned: ${order.transport.planned_date}`);
  line(`Responsible staff: ${order.transport.employee_id ?? "Unassigned"}`); line(order.transport.notes);
  const received = new Set(order.execution.proofs.flatMap(p => p.package_ids));
  for (const p of order.manifest) line(`${received.has(p.id) ? "Received" : "Pending"}: ${p.code} | ${p.kind} | ${p.name} | ID ${p.id} | parent ${p.parent_id ?? "root"} | template ${p.version_id} v${p.version_number}`);
  for (const p of order.execution.proofs) line(`Receipt: ${p.recipient} | ${p.acknowledged_at} | ${p.package_ids.length} packages | ${p.acknowledgement}`);
  for (const i of order.execution.issues) line(`Issue: ${i.kind} | package ${i.package_id} | ${i.notes} | ${i.correction ?? "Unresolved"}`);
  return pdf;
}
