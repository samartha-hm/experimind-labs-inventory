import type { ApprovalThresholds } from '@/src/contexts/ApprovalContext';

export interface POLineItemDraft {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PoDraft {
  vendorName: string;
  expectedDate: string;
  lineItems: POLineItemDraft[];
}

export type PoApprovalTier = 'tier1_procurement' | 'tier2_finance_admin' | null;

export interface PoApprovalDecision {
  requiresApproval: boolean;
  requiredTier: PoApprovalTier;
}

export function computePoTotal(lineItems: POLineItemDraft[]): number {
  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return Math.round(total * 100) / 100;
}

export function generatePoNumber(existingPoNumbers: string[], now: Date = new Date()): string {
  const year = now.getFullYear();
  const prefix = `PO-${year}-`;
  const highest = existingPoNumbers.reduce((max, poNumber) => {
    if (!poNumber.startsWith(prefix)) return max;
    const seq = parseInt(poNumber.slice(prefix.length), 10);
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
}

export function resolvePoApproval(
  total: number,
  thresholds: Pick<ApprovalThresholds, 'poTier1Threshold' | 'poTier2Threshold'>,
): PoApprovalDecision {
  if (total >= thresholds.poTier2Threshold) {
    return { requiresApproval: true, requiredTier: 'tier2_finance_admin' };
  }
  if (total >= thresholds.poTier1Threshold) {
    return { requiresApproval: true, requiredTier: 'tier1_procurement' };
  }
  return { requiresApproval: false, requiredTier: null };
}

export function poStatusAfterApproval(outcome: 'approved' | 'rejected'): 'issued' | 'cancelled' {
  return outcome === 'approved' ? 'issued' : 'cancelled';
}

export function validatePoDraft(draft: PoDraft): string[] {
  const errors: string[] = [];
  if (!draft.vendorName.trim()) errors.push('Vendor is required');
  if (!draft.expectedDate) errors.push('Expected date is required');
  if (draft.lineItems.length === 0) errors.push('Add at least one line item');
  if (draft.lineItems.some((item) => !Number.isFinite(item.quantity) || item.quantity < 1)) {
    errors.push('Each line item needs a quantity of at least 1');
  }
  if (draft.lineItems.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0)) {
    errors.push('Each line item needs a unit price greater than 0');
  }
  return errors;
}
