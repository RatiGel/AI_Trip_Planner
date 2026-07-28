/**
 * Validity rule for issued vouchers, kept free of any Mongoose import so client
 * components can render a pass's expiry without pulling the driver into the
 * browser bundle. The model re-exports these, so server code can keep importing
 * either module.
 */

/** Vouchers are valid for two weeks from the purchase date. */
export const VOUCHER_VALIDITY_DAYS = 14;

export function voucherValidUntil(purchasedAt: Date): Date {
  const d = new Date(purchasedAt);
  d.setDate(d.getDate() + VOUCHER_VALIDITY_DAYS);
  return d;
}
