// Exit 0 when the User table is empty (first boot → seed), 3 when it has rows, 4 on error.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count()
  .then((n) => { console.log(`→ users in database: ${n}`); process.exit(n === 0 ? 0 : 3); })
  .catch((e) => { console.error('→ could not query the database:', e.message); process.exit(4); })
  .finally(() => prisma.$disconnect());
