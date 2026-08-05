/**
 * Money calculation utilities to prevent floating-point rounding errors.
 * Computes all amounts in integer cents / paise internally.
 */

export const toCents = (amount: number): number => {
  return Math.round((amount || 0) * 100);
};

export const fromCents = (cents: number): number => {
  return (cents || 0) / 100;
};

export const multiplyMoney = (amount: number, factor: number): number => {
  const cents = toCents(amount);
  return fromCents(Math.round(cents * factor));
};

export const calculateTaxSplit = (
  taxableAmount: number,
  gstRatePct: number,
  isIntraState: boolean
) => {
  const totalTax = multiplyMoney(taxableAmount, gstRatePct / 100);
  if (isIntraState) {
    const cgst = fromCents(Math.round(toCents(totalTax) / 2));
    const sgst = fromCents(toCents(totalTax) - toCents(cgst));
    return { cgst, sgst, igst: 0, totalTax };
  } else {
    return { cgst: 0, sgst: 0, igst: totalTax, totalTax };
  }
};
