export function validateReservationQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Reservation quantity must be greater than zero");
  }
  return quantity;
}

export function validateReservationTtl(ttlMinutes: number): number {
  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0 || ttlMinutes > 24 * 60) {
    throw new Error("Reservation TTL must be between 1 minute and 24 hours");
  }
  return ttlMinutes;
}
