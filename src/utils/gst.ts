import { calculateTaxSplit, multiplyMoney } from "./money.ts";

/**
 * Validates Indian GSTIN format using standard GST regex rule.
 * Format: 2 digits (state code), 5 letters (PAN), 4 digits, 1 letter, 1 alphanumeric/z, 1 check digit.
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const isValidGstin = (gstin?: string): boolean => {
  if (!gstin) return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
};

export interface GstInvoiceLineInput {
  hsnCode: string;
  qty: number;
  unitPrice: number;
  gstRatePct: number;
}

export interface GstInvoiceCalculationResult {
  lines: {
    hsnCode: string;
    qty: number;
    unitPrice: number;
    taxableValue: number;
    gstRatePct: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    lineTotal: number;
  }[];
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  grandTotal: number;
}

export function computeGstInvoice(
  linesInput: GstInvoiceLineInput[],
  sellerStateCode: string,
  buyerStateCode: string
): GstInvoiceCalculationResult {
  const isIntraState = sellerStateCode.trim() === buyerStateCode.trim();

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const processedLines = linesInput.map((item) => {
    const taxableValue = multiplyMoney(item.unitPrice, item.qty);
    const taxSplit = calculateTaxSplit(taxableValue, item.gstRatePct, isIntraState);

    const lineTotal = taxableValue + taxSplit.totalTax;

    totalTaxable += taxableValue;
    totalCgst += taxSplit.cgst;
    totalSgst += taxSplit.sgst;
    totalIgst += taxSplit.igst;

    return {
      hsnCode: item.hsnCode,
      qty: item.qty,
      unitPrice: item.unitPrice,
      taxableValue,
      gstRatePct: item.gstRatePct,
      cgstAmount: taxSplit.cgst,
      sgstAmount: taxSplit.sgst,
      igstAmount: taxSplit.igst,
      lineTotal,
    };
  });

  const totalTax = totalCgst + totalSgst + totalIgst;
  const grandTotal = totalTaxable + totalTax;

  return {
    lines: processedLines,
    totalTaxable,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal,
  };
}
