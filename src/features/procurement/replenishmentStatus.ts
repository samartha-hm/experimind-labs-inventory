export type ReplenishmentStatus =
  | 'draft'
  | 'pending_approval'
  | 'ordered'
  | 'in_transit'
  | 'partially_received'
  | 'backordered'
  | 'received'
  | 'cancelled';

export interface ReplenishmentLine {
  quantity?: number;
  receivedQty?: number;
}

export interface ReplenishmentOrder {
  status?: string | null;
  expectedDate?: string | null;
  items?: ReplenishmentLine[];
}

export interface ReplenishmentSummary {
  status: ReplenishmentStatus;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  isOverdue: boolean;
}

const cancelledStatuses = new Set(['cancelled', 'canceled']);
const receivedStatuses = new Set(['received', 'complete', 'completed']);
const inTransitStatuses = new Set(['sent', 'issued', 'in_transit', 'shipped']);

export function summarizeReplenishmentOrder(
  order: ReplenishmentOrder,
  today = new Date(),
): ReplenishmentSummary {
  const orderedQty = (order.items ?? []).reduce((sum, line) => sum + Math.max(0, Number(line.quantity) || 0), 0);
  const receivedQty = (order.items ?? []).reduce((sum, line) => sum + Math.max(0, Number(line.receivedQty) || 0), 0);
  const remainingQty = Math.max(0, orderedQty - receivedQty);
  const rawStatus = order.status?.toLowerCase() ?? 'draft';
  const expectedDate = order.expectedDate ? new Date(order.expectedDate) : null;
  const isOverdue = Boolean(
    expectedDate &&
    !Number.isNaN(expectedDate.getTime()) &&
    expectedDate < today &&
    remainingQty > 0 &&
    !cancelledStatuses.has(rawStatus),
  );

  let status: ReplenishmentStatus;
  if (cancelledStatuses.has(rawStatus)) {
    status = 'cancelled';
  } else if (rawStatus === 'pending_approval') {
    status = 'pending_approval';
  } else if ((orderedQty > 0 && receivedQty >= orderedQty) || receivedStatuses.has(rawStatus)) {
    status = 'received';
  } else if (receivedQty > 0) {
    status = isOverdue ? 'backordered' : 'partially_received';
  } else if (inTransitStatuses.has(rawStatus)) {
    status = isOverdue ? 'backordered' : 'in_transit';
  } else if (rawStatus === 'approved' || rawStatus === 'ordered' || rawStatus === 'pending') {
    status = 'ordered';
  } else {
    status = 'draft';
  }

  return { status, orderedQty, receivedQty, remainingQty, isOverdue };
}
