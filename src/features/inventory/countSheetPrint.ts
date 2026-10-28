interface PrintableSheet {
  session_name: string; session_id: string; revision: number;
  instructions: string;
  rows: {sku: string; item_id: string; name: string; canonical_unit: string; location: string}[];
}
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]!));
/** Standalone inert HTML prevents printing the parent page's expected quantities. */
export function printableCountSheet(sheet: PrintableSheet) {
  const rows = sheet.rows.map(row => `<tr>${[row.sku, row.item_id, row.name, row.canonical_unit, row.location, '________', 'UNKNOWN / MISSING / DISPUTED / VERIFIED', '________'].map(value => `<td>${escape(value ?? '')}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Unsigned blind count sheet</title><style>body{font:14px sans-serif;margin:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid;padding:8px;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}@media print{@page{size:landscape}}</style><h1>UNSIGNED BLIND COUNT SHEET</h1><p>${escape(sheet.session_name)} · ${escape(sheet.session_id)} · r${sheet.revision}</p><p>${escape(sheet.instructions)}</p><p>Operator: __________ Count pass: __________ Date: __________ Independent reviewer: __________</p><table><caption>Preparation only — opening balance posting NOT AUTHORIZED</caption><thead><tr>${['SKU', 'Identity', 'Item', 'Unit', 'Location', 'Quantity', 'Physical status', 'Evidence / reviewer'].map(value => `<th scope="col">${value}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></html>`;
}
