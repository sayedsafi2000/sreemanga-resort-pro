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

/** Visible for tests / seed resets. */
export function resetFinanceCategoriesMemo(): void {
  initialised = false;
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
