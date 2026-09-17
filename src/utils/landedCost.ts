/**
 * Customs Landed Cost Engine for Indian Electronics Sourcing (CBIC Regulations)
 * Computes Assessable Value, Basic Customs Duty (BCD), Social Welfare Surcharge (SWS),
 * Integrated GST (IGST), and final Landed Cost per unit in INR.
 */

export interface LandedCostInput {
  fobPriceForeign: number;      // FOB unit price in foreign currency (e.g. USD, CNY, EUR)
  exchangeRate: number;         // CBIC declared exchange rate (e.g. 1 USD = 86.5 INR)
  quantity: number;             // Total units imported
  freightInr?: number;          // Air / Sea freight in INR
  insuranceInr?: number;        // Marine / Transit insurance in INR (defaults to 1.125% of FOB)
  bcdRatePct?: number;          // Basic Customs Duty percentage (default 7.5% for electronic passives/ICs)
  swsRatePct?: number;          // Social Welfare Surcharge percentage on BCD (standard 10%)
  igstRatePct?: number;         // Integrated GST rate (standard 18% for electronics)
  clearingChargesInr?: number;  // Local CHA, port handling, and inland transport in INR
}

export interface LandedCostBreakdown {
  fobTotalInr: number;
  freightInr: number;
  insuranceInr: number;
  assessableValueInr: number;
  bcdAmountInr: number;
  swsAmountInr: number;
  igstAmountInr: number;
  totalDutyAndTaxesInr: number;
  clearingChargesInr: number;
  totalLandedCostInr: number;
  unitLandedCostInr: number;
}

function roundCurrency(val: number): number {
  return Number(Math.round(Number(val + "e2")) + "e-2");
}

export function computeLandedCost(input: LandedCostInput): LandedCostBreakdown {
  const qty = Math.max(1, input.quantity);
  const exRate = Math.max(0.001, input.exchangeRate);
  const fobTotalInr = roundCurrency(input.fobPriceForeign * exRate * qty);

  const freightInr = input.freightInr || 0;
  // Default statutory insurance is 1.125% of FOB if not actual
  const insuranceInr = input.insuranceInr !== undefined 
    ? input.insuranceInr 
    : roundCurrency(fobTotalInr * 0.01125);

  const assessableValueInr = roundCurrency(fobTotalInr + freightInr + insuranceInr);

  const bcdRate = (input.bcdRatePct !== undefined ? input.bcdRatePct : 7.5) / 100;
  const bcdAmountInr = roundCurrency(assessableValueInr * bcdRate);

  // SWS is standard 10% of BCD
  const swsRate = (input.swsRatePct !== undefined ? input.swsRatePct : 10) / 100;
  const swsAmountInr = roundCurrency(bcdAmountInr * swsRate);

  // IGST is levied on (Assessable Value + BCD + SWS)
  const igstRate = (input.igstRatePct !== undefined ? input.igstRatePct : 18) / 100;
  const igstBaseInr = assessableValueInr + bcdAmountInr + swsAmountInr;
  const igstAmountInr = roundCurrency(igstBaseInr * igstRate);

  const totalDutyAndTaxesInr = roundCurrency(bcdAmountInr + swsAmountInr + igstAmountInr);
  const clearingChargesInr = input.clearingChargesInr || 0;

  const totalLandedCostInr = roundCurrency(assessableValueInr + totalDutyAndTaxesInr + clearingChargesInr);
  const unitLandedCostInr = roundCurrency(totalLandedCostInr / qty);

  return {
    fobTotalInr,
    freightInr,
    insuranceInr,
    assessableValueInr,
    bcdAmountInr,
    swsAmountInr,
    igstAmountInr,
    totalDutyAndTaxesInr,
    clearingChargesInr,
    totalLandedCostInr,
    unitLandedCostInr,
  };
}
