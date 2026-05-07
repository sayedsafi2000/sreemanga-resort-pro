/**
 * Backfill: create mirrored Expense rows for every existing PAID StaffSalary
 * that doesn't yet have one. Idempotent — safe to re-run after cancellations
 * or new pay rounds. Run with:
 *
 *   cd apps/server && npx tsx prisma/backfill-salary-expenses.ts
 *
 * Reads from / writes to the same DATABASE_URL the server uses.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

async function main(): Promise<void> {
  const category = await prisma.expenseCategory.findFirst({
    where: { name: 'Staff Salary' },
    select: { id: true },
  });
  if (!category) {
    console.error("No 'Staff Salary' ExpenseCategory found. Run npm run db:seed first.");
    process.exitCode = 1;
    return;
  }

  // Pull every salary regardless of status — we want CANCELLED ones mirrored too,
  // so the audit trail in /expenditures matches /staff-salaries.
  const salaries = await prisma.staffSalary.findMany({
    include: { user: { select: { name: true } } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const salary of salaries) {
    if (salary.status !== 'PAID' && salary.status !== 'CANCELLED') {
      // PENDING with no prior expense — nothing to mirror yet.
      const existing = await prisma.expense.findUnique({ where: { salaryId: salary.id } });
      if (!existing) {
        skipped++;
        continue;
      }
    }
    const monthName = MONTH_NAMES[salary.month - 1] || String(salary.month);
    const title = `Salary — ${salary.user?.name || 'Staff'} (${monthName} ${salary.year})`;
    const expenseDate = salary.paymentDate || new Date();
    const expenseStatus = salary.status === 'PAID' ? 'PAID' : 'CANCELLED';
    const result = await prisma.expense.upsert({
      where: { salaryId: salary.id },
      update: {
        title,
        amount: salary.amount,
        categoryId: category.id,
        date: expenseDate,
        paymentMethod: 'CASH',
        paidTo: salary.user?.name || undefined,
        description: salary.notes || `Auto-recorded from /staff-salaries`,
        status: expenseStatus,
      },
      create: {
        title,
        amount: salary.amount,
        categoryId: category.id,
        date: expenseDate,
        paymentMethod: 'CASH',
        paidTo: salary.user?.name || undefined,
        description: salary.notes || `Auto-recorded from /staff-salaries`,
        status: expenseStatus,
        salaryId: salary.id,
      },
    });
    // Heuristic: createdAt within 5s of now means we just inserted it.
    if (Date.now() - result.createdAt.getTime() < 5_000) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`Backfill done. salaries=${salaries.length} created=${created} updated=${updated} skipped(pending,no-expense)=${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
