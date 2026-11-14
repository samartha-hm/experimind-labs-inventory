/** Existing ledger numeric(12,4) is preserved: exact four-place stock, six-place conversion factors. */
const scale = 10_000n;
export function stockUnits(text: string): bigint {
  if (!/^\d{1,8}(\.\d{1,4})?$/.test(text)) throw new Error("Stock quantity must be a nonnegative decimal with at most four places and eight integer digits");
  const [whole, fraction = ""] = text.split("."); return BigInt(whole) * scale + BigInt(fraction.padEnd(4,"0"));
}
export function stockText(value: bigint): string {
  const sign = value < 0n ? "-" : ""; const v = value < 0n ? -value : value;
  if (v > 999_999_999_999n) throw new Error("Stock balance exceeds ledger range");
  return `${sign}${v / scale}.${String(v % scale).padStart(4,"0")}`;
}
export function convertStock(quantity: string, factor: string): string {
  if (!/^\d+(\.\d{1,6})?$/.test(factor)) throw new Error("Invalid conversion factor");
  const [whole, fraction=""] = factor.split("."); const f = BigInt(whole)*1_000_000n+BigInt(fraction.padEnd(6,"0"));
  const product = stockUnits(quantity)*f;
  if (f <= 0n || product % 1_000_000n) throw new Error("Conversion must be positive and exact within four stock decimal places");
  return stockText(product / 1_000_000n);
}
