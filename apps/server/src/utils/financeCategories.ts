import { Prisma } from '@prisma/client';
import prisma from './prisma';

/**
 * Financial Report plumbing for expense categories.
 *
 * Categories carry a `kind` that decides where their expenses land on the statement
 * (EXPENSE / PURCHASE / FIXED_ASSET / INCOME_TAX). This one-time initialiser creates the
 * two system categories the report needs ("Income Tax", "Fixed Assets"), marks the seeded
 * cost-of-goods categories as PURCHASE and records a Setting flag so staff re-kinding is
 * never overwritten later. Safe to call on every request — it is a single lookup once done.
 */

type Db = Prisma.TransactionClient | typeof prisma;

export const FINANCE_SETTING_KEY = 'financeCategoriesInitialized';
export const INCOME_TAX_CATEGORY = 'Income Tax';
export const FIXED_ASSETS_CATEGORY = 'Fixed Assets';
export const INCOME_TAX_ACCOUNT_CODE = '5008';
const FIXED_ASSET_ACCOUNT_CODE = '1101';
const PURCHASE_DEFAULTS = ['Food & Kitchen', 'Supplies'];

let initialised = false;
let legacyRetired = false;

/** Visible for tests / seed resets. */
export function resetFinanceCategoriesMemo(): void {
  initialised = false;
  legacyRetired = false;
}

async function initWith(tx: Prisma.TransactionClient): Promise<void> {
  // Claim the flag first: a concurrent initialiser hits P2002 and backs off.
  await tx.setting.create({
    data: {
      key: FINANCE_SETTING_KEY,
      value: '1',
      type: 'system',
      description: 'Internal: Financial Report categories initialised',
    },
  });

  const parent = await tx.account.findUnique({ where: { code: '5000' } });
  const taxAccount = await tx.account.upsert({
    where: { code: INCOME_TAX_ACCOUNT_CODE },
    update: {},
    create: {
      code: INCOME_TAX_ACCOUNT_CODE,
      name: 'Income Tax',
      type: 'EXPENSE',
      parentId: parent?.id ?? null,
      sortOrder: 28,
    },
  });
  const fixedAccount = await tx.account.findUnique({ where: { code: FIXED_ASSET_ACCOUNT_CODE } });

  const agg = await tx.expenseCategory.aggregate({ _max: { sortOrder: true } });
  let nextSort = (agg._max.sortOrder ?? 0) + 1;
  const system = [
    { name: INCOME_TAX_CATEGORY, kind: 'INCOME_TAX' as const, accountId: taxAccount.id as string | null },
    { name: FIXED_ASSETS_CATEGORY, kind: 'FIXED_ASSET' as const, accountId: fixedAccount?.id ?? null },
  ];
  for (const c of system) {
    const existing = await tx.expenseCategory.findFirst({ where: { name: { equals: c.name, mode: 'insensitive' } } });
    if (existing) {
      await tx.expenseCategory.update({
        where: { id: existing.id },
        data: { kind: c.kind, ...(existing.accountId ? {} : { accountId: c.accountId }) },
      });
    } else {
      await tx.expenseCategory.create({
        data: { name: c.name, kind: c.kind, accountId: c.accountId, sortOrder: nextSort++, fields: [] },
      });
    }
  }

  // Cost-of-goods defaults: by seeded name (case-insensitive) or by the seeded account link
  // (5004 Food Supplies / 5007 Inventory-COGS), so renamed categories are still recognised.
  await tx.expenseCategory.updateMany({
    where: {
      kind: 'EXPENSE',
      OR: [{ name: { in: PURCHASE_DEFAULTS, mode: 'insensitive' } }, { account: { code: { in: ['5004', '5007'] } } }],
    },
    data: { kind: 'PURCHASE' },
  });

  // Holdings cancelled with a refund before refundedAmount existed: the ledger OUT that
  // cancelHolding posted (description + amount) is the evidence. Idempotent (refundedAmount = 0 only).
  const cancelled = await tx.shareHolding.findMany({
    where: { status: 'CANCELLED', paidAmount: { gt: 0 }, refundedAmount: 0 },
    include: { shareholder: { select: { name: true } } },
  });
  for (const h of cancelled) {
    const txn = await tx.accountTransaction.findFirst({
      where: {
        direction: 'OUT',
        referenceType: 'MANUAL',
        amount: h.paidAmount,
        description: { startsWith: `Share capital refund - ${h.shareholder.name}` },
      },
    });
    if (txn) {
      await tx.shareHolding.update({
        where: { id: h.id },
        data: { refundedAmount: h.paidAmount, refundedAt: h.cancelledAt ?? txn.transactionDate },
      });
    }
  }
}

export async function ensureFinanceCategories(db: Db = prisma): Promise<void> {
  if (initialised) return;
  const flag = await db.setting.findUnique({ where: { key: FINANCE_SETTING_KEY } });
  if (flag) {
    initialised = true;
    return;
  }
  try {
    if ('$transaction' in db) {
      await (db as typeof prisma).$transaction((tx) => initWith(tx));
    } else {
      await initWith(db as Prisma.TransactionClient);
    }
    initialised = true;
  } catch (e: any) {
    if (e?.code === 'P2002') {
      initialised = true; // another request initialised concurrently
      return;
    }
    throw e;
  }
}

/**
 * Account 5007 "Inventory / COGS" was dropped from the seed (stock purchases are ordinary
 * PURCHASE-kind expense categories now) but live databases still carry it. Fold it into
 * 5006 Miscellaneous: re-point its expense categories, clear inventory items that defaulted
 * to it, then delete the account when nothing ever posted to it, otherwise deactivate it.
 * Memoised in-process like ensureFinanceCategories — a single lookup per boot once done.
 */
const LEGACY_ACCOUNT_CODE = '5007';
const LEGACY_FALLBACK_CODE = '5006';

async function retireWith(tx: Prisma.TransactionClient): Promise<void> {
  const legacy = await tx.account.findUnique({
    where: { code: LEGACY_ACCOUNT_CODE },
    include: { _count: { select: { transactions: true, children: true } } },
  });
  if (!legacy || !legacy.isActive) return;

  const fallback = await tx.account.findUnique({ where: { code: LEGACY_FALLBACK_CODE } });
  if (fallback) {
    await tx.expenseCategory.updateMany({ where: { accountId: legacy.id }, data: { accountId: fallback.id } });
  }
  await tx.inventoryItem.updateMany({
    where: { expenseAccountCode: LEGACY_ACCOUNT_CODE },
    data: { expenseAccountCode: null },
  });

  // Categories can only still point here when 5006 is missing — then the FK forbids a delete.
  const stillLinked = await tx.expenseCategory.count({ where: { accountId: legacy.id } });
  const removable = legacy._count.transactions === 0 && legacy._count.children === 0 && stillLinked === 0;
  if (removable) {
    await tx.account.delete({ where: { id: legacy.id } });
  } else {
    await tx.account.update({ where: { id: legacy.id }, data: { isActive: false } });
  }
}

export async function retireLegacyAccounts(db: Db = prisma): Promise<void> {
  if (legacyRetired) return;
  const legacy = await db.account.findUnique({ where: { code: LEGACY_ACCOUNT_CODE }, select: { isActive: true } });
  if (!legacy || !legacy.isActive) {
    legacyRetired = true;
    return;
  }
  try {
    if ('$transaction' in db) {
      await (db as typeof prisma).$transaction((tx) => retireWith(tx));
    } else {
      await retireWith(db as Prisma.TransactionClient);
    }
    legacyRetired = true;
  } catch (e: any) {
    if (e?.code === 'P2025') {
      legacyRetired = true; // a concurrent request retired it first
      return;
    }
    throw e;
  }
}
