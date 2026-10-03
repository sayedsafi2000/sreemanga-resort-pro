/** One currency presentation for the whole public site: the Taka sign + thousands separators. */
export const CURRENCY_SYMBOL = '৳';

export function fmtMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${CURRENCY_SYMBOL}${(Number.isFinite(n) ? n : 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
