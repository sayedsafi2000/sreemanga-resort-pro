/** Types + helpers shared by the booking pages (list, new/edit, invoice, calendar). */

export type Payment = {
  id: string; amount: number; method: string; status: string; transactionId?: string | null; notes?: string | null; createdAt: string;
};
export type Room = {
  id: string; name: string; type: string; price: number; weekendPrice?: number | null; extraGuestCharge?: number | null;
  capacity: number; maxAdults?: number | null; maxChildren?: number | null; status: string; mainImage?: string | null;
  facilities?: unknown; description?: string | null; bedType?: string | null;
};
export type Guest = {
  id: string; name: string; phone: string; email?: string | null; nid?: string | null; address?: string | null;
  gender?: string | null; dateOfBirth?: string | null;
};
export type Booking = {
  id: string; invoiceNo: number; invoiceLabel: string; roomId: string; guestId: string; staffId?: string | null;
  adults: number; children: number; extraPersons: number; rate?: number | null; extraCharge: number; extraChargeNote?: string | null;
  staffDiscount: number; discountAmount: number; totalAmount: number; isVip: boolean; isForeigner: boolean; isStakeholder: boolean;
  checkInDate: string; checkOutDate: string; status: string; notes?: string | null; createdAt: string; updatedAt: string;
  nights: number; paid: number; due: number; source: 'ADMIN' | 'WEB';
  preferredPaymentTiming?: string | null; preferredPaymentMethod?: string | null; paymentTransactionId?: string | null; paymentProofImage?: string | null;
  room: Room; guest: Guest; staff?: { id: string; name: string; role: string } | null; payments: Payment[];
  voucher?: { id: string; name: string; codeHint?: string | null } | null;
  pricing: { rate: number; nights: number; roomSubtotal: number; extraPersons: number; extraPersonTotal: number; extraCharge: number; gross: number; voucherDiscount: number; staffDiscount: number; total: number };
};
export type CellState = 'AVAILABLE' | 'SELECTED' | 'RESERVED' | 'BOOKED' | 'BLOCKED';

export const PAY_METHODS = ['CASH', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CARD', 'MOBILE_BANKING'] as const;
export const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash', BKASH: 'bKash', NAGAD: 'Nagad', BANK_TRANSFER: 'Bank transfer', CARD: 'Card', MOBILE_BANKING: 'Mobile banking', STRIPE: 'Card (Stripe)',
};
export const TYPE_LABEL: Record<string, string> = {
  STANDARD: 'Standard', DELUXE: 'Deluxe', SUITE: 'Suite', FAMILY: 'Family', PRESIDENTIAL: 'Presidential',
};

export const fmt = (n: number | null | undefined) => `৳${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export const fmtDate = (d?: string | Date | null, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-GB', opts) : '—';
export const fmtDateTime = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** YYYY-MM-DD in local time. */
export const toYmd = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const todayYmd = () => toYmd(new Date());
export const addDaysYmd = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return toYmd(dt);
};
export const nightsBetween = (ci?: string, co?: string) => {
  if (!ci || !co) return 0;
  const a = new Date(ci.slice(0, 10)).getTime(); const b = new Date(co.slice(0, 10)).getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
};

export const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:     { label: 'Reserved',    cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',     dot: 'bg-amber-500' },
  CONFIRMED:   { label: 'Booked',      cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dot: 'bg-emerald-500' },
  CHECKED_IN:  { label: 'In-house',    cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',        dot: 'bg-blue-500' },
  CHECKED_OUT: { label: 'Checked-out', cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/60',    dot: 'bg-slate-400' },
  CANCELLED:   { label: 'Cancelled',   cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',        dot: 'bg-rose-500' },
};

/** Room-grid / calendar cell colours. */
export const STATE_META: Record<CellState, { label: string; card: string; chip: string }> = {
  AVAILABLE: { label: 'Available', card: 'border-slate-200 bg-white hover:border-primary/60 hover:shadow-card-hover', chip: 'bg-white text-slate-700 ring-1 ring-slate-200' },
  SELECTED:  { label: 'Selected',  card: 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/30', chip: 'bg-emerald-500 text-white' },
  RESERVED:  { label: 'Reserved',  card: 'border-amber-400 bg-amber-400 text-amber-950', chip: 'bg-amber-400 text-amber-950' },
  BOOKED:    { label: 'Booked',    card: 'border-rose-500 bg-rose-500 text-white', chip: 'bg-rose-500 text-white' },
  BLOCKED:   { label: 'Blocked',   card: 'border-slate-400 bg-slate-400 text-white', chip: 'bg-slate-500 text-white' },
};

/** Room.facilities is a JSON blob — accept string[], {name}[], or {key: true}. */
export function facilitiesOf(room: Pick<Room, 'facilities'> | null | undefined): string[] {
  const f = room?.facilities as unknown;
  if (!f) return [];
  if (Array.isArray(f)) return f.map((x) => (typeof x === 'string' ? x : (x as any)?.name ?? (x as any)?.label ?? '')).filter(Boolean);
  if (typeof f === 'object') return Object.entries(f as Record<string, unknown>).filter(([, v]) => v).map(([k]) => k.replace(/[_-]/g, ' '));
  return [];
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export const errMsg = (e: any, fallback: string) => e?.response?.data?.message || fallback;

/** "Pina Vista, Sreemangal" — resort name plus town for list/calendar headers. */
export function resortTitle(settings: Record<string, any> | null | undefined): string | null {
  const name = settings?.resortName; if (!name) return null;
  const address = String(settings?.resortAddress ?? '');
  const town = /sreemangal|srimangal/i.test(address) ? 'Sreemangal' : address.split(',').map((x) => x.trim()).filter((x) => x && !/bangladesh/i.test(x)).pop();
  return town ? `${name}, ${town}` : name;
}
