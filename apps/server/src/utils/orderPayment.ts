/** Restaurant order money helpers — shared by the order payment and refund endpoints. */

/** netAmount = totalPrice - discount + serviceCharge (never below 0). */
export function computeNet(totalPrice: number, discount: number, serviceCharge: number): number {
  return Math.max(0, totalPrice - discount + serviceCharge);
}

export function derivePaymentStatus(paid: number, net: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (paid <= 0) return 'UNPAID';
  if (paid >= net) return 'PAID';
  return 'PARTIAL';
}
