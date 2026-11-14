import { useState } from "react";
import { apiFetch } from "../../utils/api";
import { downloadPreparation } from "./OperationalReadinessPanel";
import { printableCountSheet } from "./countSheetPrint";
import type { OperationalPreparationService } from "../../services/OperationalPreparationService";
type Sheet = Awaited<ReturnType<OperationalPreparationService["countSheet"]>>;
export default function BlindCountSheet({id, revision}: {id: string; revision: number}) {
  const [sheet, setSheet] = useState<Sheet>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = sheet?.session_id === id && sheet.revision === revision ? sheet : undefined;
  async function load() {
    setBusy(true); setError(""); setSheet(undefined);
    try { setSheet(await apiFetch(`/api/v1/stocktakes/${id}/count-sheet?revision=${revision}`)); }
    catch { setError("Count sheet unavailable or stale. Reload the stocktake before retrying."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3" aria-label="Blind count preparation">
    <button className="min-h-11 rounded-xl border px-4" disabled={busy} onClick={() => void load()}>Prepare blind count sheet</button>
    {error && <p role="alert">{error}</p>}
    {current && <>
      <p>{current.kind} · {current.session_name} · r{current.revision}</p><p>{current.instructions}</p>
      <p>Assign operator: __________ Independent count pass: __________ Date: __________</p>
      <div className="overflow-x-auto"><table className="w-full text-left"><caption>Blank physical count sheet; no expected balances</caption>
        <thead><tr>{["SKU / identity", "Item", "Unit", "Location", "Quantity", "Physical status", "Evidence / reviewer"].map(label => <th className="border p-2" key={label}>{label}</th>)}</tr></thead>
        <tbody>{current.rows.map(row => <tr key={`${row.item_id}:${row.location}`}>
          <td className="break-all border p-2">{row.sku}<br/>{row.item_id}</td><td className="border p-2">{row.name}</td><td className="border p-2">{row.canonical_unit}</td><td className="border p-2">{row.location}</td>
          <td className="border p-2">________</td><td className="border p-2">UNKNOWN / MISSING / DISPUTED / VERIFIED</td><td className="border p-2">________</td>
        </tr>)}</tbody>
      </table></div>
      <button className="min-h-11 rounded-xl border px-4" onClick={() => downloadPreparation(current, `unsigned-count-${id}-r${revision}.json`)}>Export unsigned blank count sheet</button>
      <button className="min-h-11 rounded-xl border px-4" onClick={() => {
        const url = URL.createObjectURL(new Blob([printableCountSheet(current)], {type: "text/html"}));
        const link = document.createElement("a"); link.href = url; link.download = `blind-count-${id}-r${revision}.html`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>Download printable blind sheet</button>
      <p>Open the downloaded sheet and print it separately. Blank fields are intentional; this sheet does not save counts or approvals.</p>
    </>}
  </section>;
}
