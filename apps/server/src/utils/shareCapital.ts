/**
 * Share capital helpers (pure — unit tested in tests/shareCapital.test.ts).
 *
 * Shares are sold in fixed-price units (tiers). A holding is one purchase of
 * N units of a tier; it may be paid in instalments and only counts toward
 * profit once fully paid (ACTIVE). Profit is split by paid-up capital.
 */

export const DEFAULT_SHARE_TIERS = [
  { code: 'GOLD', name: 'Gold', unitPrice: 150000, sortOrder: 1 },
  { code: 'PLATINUM', name: 'Platinum', unitPrice: 300000, sortOrder: 2 },
] as const;

export type HoldingStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELLED';

export type HoldingLite = {
  quantity: number;
  totalPrice: number;
  paidAmount: number;
  status: HoldingStatus;
  tier?: { code: string; name?: string };
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Status a holding should carry for a paid amount. A cancelled holding stays cancelled. */
export function holdingStatusFor(paidAmount: number, totalPrice: number, current?: string): HoldingStatus {
  if (current === 'CANCELLED') return 'CANCELLED';
  return paidAmount + 1e-6 >= totalPrice ? 'ACTIVE' : 'PENDING_PAYMENT';
}

/** Paid-up capital that earns profit: fully paid (ACTIVE) holdings only. */
export function activeCapital(holdings: HoldingLite[]): number {
  return round2(holdings.filter((h) => h.status === 'ACTIVE').reduce((s, h) => s + h.totalPrice, 0));
}

export function summarizeHoldings(holdings: HoldingLite[]) {
  const live = holdings.filter((h) => h.status !== 'CANCELLED');
  const units: Record<string, number> = {};
  for (const h of live) {
    const code = h.tier?.code ?? 'UNKNOWN';
    units[code] = (units[code] ?? 0) + h.quantity;
  }
  return {
    units,
    totalUnits: live.reduce((s, h) => s + h.quantity, 0),
    activeCapital: activeCapital(holdings),
    committedCapital: round2(live.reduce((s, h) => s + h.totalPrice, 0)),
    paidTotal: round2(live.reduce((s, h) => s + h.paidAmount, 0)),
    dueTotal: round2(live.reduce((s, h) => s + Math.max(0, h.totalPrice - h.paidAmount), 0)),
    pendingHoldings: live.filter((h) => h.status === 'PENDING_PAYMENT').length,
  };
}

/** "2 Gold · 1 Platinum" — for compact labels (guest picker, vouchers). */
export function describeUnits(holdings: HoldingLite[]): string {
  const byTier = new Map<string, number>();
  for (const h of holdings) {
    if (h.status === 'CANCELLED') continue;
    const name = h.tier?.name ?? h.tier?.code ?? 'Share';
    byTier.set(name, (byTier.get(name) ?? 0) + h.quantity);
  }
  return [...byTier.entries()].map(([name, qty]) => `${qty} ${name}`).join(' · ') || 'No shares';
}

export type CapitalHolder = { id: string; capital: number };
export type CapitalShare = {
  shareholderId: string;
  capitalAmount: number;
  sharePercent: number;
  amount: number;
};

/**
 * Split profit in proportion to paid-up capital. Largest-remainder rounding so
 * the paisa add up to exactly the profit — nobody is short-changed by rounding.
 * Holders with no paid-up capital are excluded. A zero/negative profit pays 0.
 */
export function calculateCapitalShares(
  totalProfit: number,
  holders: CapitalHolder[]
): { totalCapital: number; shares: CapitalShare[] } {
  const eligible = holders.filter((h) => h.capital > 0);
  const totalCapital = round2(eligible.reduce((s, h) => s + h.capital, 0));
  const pct = (capital: number) => (totalCapital > 0 ? round2((capital / totalCapital) * 100) : 0);

  if (totalCapital <= 0 || totalProfit <= 0) {
    return {
      totalCapital,
      shares: eligible.map((h) => ({ shareholderId: h.id, capitalAmount: h.capital, sharePercent: pct(h.capital), amount: 0 })),
    };
  }

  const totalPaisa = Math.round(totalProfit * 100);
  const raw = eligible.map((h) => (h.capital / totalCapital) * totalPaisa);
  const paisa = raw.map(Math.floor);
  let remainder = totalPaisa - paisa.reduce((s, v) => s + v, 0);
  const byFraction = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of byFraction) {
    if (remainder <= 0) break;
    paisa[i] += 1;
    remainder -= 1;
  }

  return {
    totalCapital,
    shares: eligible.map((h, i) => ({
      shareholderId: h.id,
      capitalAmount: h.capital,
      sharePercent: pct(h.capital),
      amount: paisa[i] / 100,
    })),
  };
}

export function tierAvailability(tier: { totalUnits: number | null }, soldUnits: number) {
  return {
    soldUnits,
    availableUnits: tier.totalUnits == null ? null : Math.max(0, tier.totalUnits - soldUnits),
  };
}
