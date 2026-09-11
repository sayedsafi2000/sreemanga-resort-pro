/**
 * Rewrites Nirjon-era content already stored in the database to Pina Vista.
 *
 * Covers every string / string[] column of the public-site content models
 * (settings, blogs, nearby spots, menu items, rooms, gallery, day-long
 * products): brand names, placeholder emails/domains, the Bengali site name,
 * and the old seed image paths (/rooms/*.avif, /gallery/scene-*.jpg → the
 * Pina Vista renders in apps/web/public/pina-vista/).
 *
 *   npx tsx scripts/rebrand-pina-vista.ts --dry-run   # list changes only
 *   npx tsx scripts/rebrand-pina-vista.ts             # apply
 *   npx tsx scripts/rebrand-pina-vista.ts --users     # also move staff login
 *                                                     # emails @resortnirjon.com → @pinavista.com
 *
 * Idempotent: rows that already say Pina Vista are left untouched.
 */
import 'dotenv/config';
import prisma from '../src/utils/prisma';

const DRY = process.argv.includes('--dry-run');
const USERS = process.argv.includes('--users');

const RULES: [RegExp | string, string][] = [
  ["Nirjon Nature's Hideout", 'Pina Vista'],
  ['Nirjon Nature&apos;s Hideout', 'Pina Vista'],
  ['Nirjon Nature Hideout', 'Pina Vista'],
  ['Nirjon Nature Escape', 'Pina Vista'],
  ["Nirjon Nature's", "Pina Vista's"],
  ["Resort Nirjon's", "Pina Vista's"],
  ['Resort Nirjon Ltd.', 'Pina Vista Ltd.'],
  ['Resort Nirjon', 'Pina Vista'],
  ['nirjonnature@gmail.com', 'info@pinavista.com'],
  ['nirjon-nature.bd', 'pinavista.com'],
  ['resortnirjon.com', 'pinavista.com'],
  ['নির্জন নেচারস হাইডআউট', 'পিনা ভিস্তা'],
  [/\bNirjon\b/g, 'Pina Vista'],
  // old seed image paths → Pina Vista renders (same mapping as next.config.js rewrites)
  ['/rooms/room1.avif', '/pina-vista/09-hill-cottage.jpg'],
  ['/rooms/room2.avif', '/pina-vista/04-brick-villa.jpg'],
  ['/rooms/room3.avif', '/pina-vista/05-cottage-row.jpg'],
  ['/rooms/room4.avif', '/pina-vista/12-aerial-pool.jpg'],
  ['/rooms/room5.avif', '/pina-vista/08-aerial-villa.jpg'],
  ['/gallery/scene-1.jpg', '/pina-vista/03-hillside-cottages.jpg'],
  ['/gallery/scene-2.jpg', '/pina-vista/01-aerial-site.jpg'],
  ['/gallery/scene-3.jpg', '/pina-vista/13-garden-driveway.jpg'],
  ['/gallery/scene-4.jpg', '/pina-vista/11-amphitheatre-hill.jpg'],
];

function rewrite(value: string): string {
  let out = value;
  for (const [from, to] of RULES) out = typeof from === 'string' ? out.split(from).join(to) : out.replace(from, to);
  return out;
}

const SKIP_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'key', 'slug', 'email', 'password']);

/** Returns the subset of scalar string / string[] fields whose value changes. */
function diffRow(row: Record<string, unknown>): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (SKIP_KEYS.has(k)) continue;
    if (typeof v === 'string') {
      const nv = rewrite(v);
      if (nv !== v) changes[k] = nv;
    } else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      const nv = (v as string[]).map(rewrite);
      if (nv.some((x, i) => x !== v[i])) changes[k] = nv;
    }
  }
  return changes;
}

type Delegate = { findMany: () => Promise<any[]>; update: (args: any) => Promise<any> };
const MODELS: [string, Delegate][] = [
  ['Setting', prisma.setting],
  ['SiteBlog', prisma.siteBlog],
  ['SiteNearbySpot', prisma.siteNearbySpot],
  ['RestaurantMenu', prisma.restaurantMenu],
  ['Room', prisma.room],
  ['SiteGalleryItem', prisma.siteGalleryItem],
  ['DayLongProduct', prisma.dayLongProduct],
];

async function main() {
  let total = 0;
  for (const [name, model] of MODELS) {
    let rows: any[];
    try {
      rows = await model.findMany();
    } catch (err: any) {
      console.log(`- ${name}: skipped (${err?.code === 'P2021' ? 'table missing — run prisma db push' : err?.message})`);
      continue;
    }
    for (const row of rows) {
      const changes = diffRow(row);
      if (Object.keys(changes).length === 0) continue;
      total++;
      const label = row.key ?? row.name ?? row.title ?? row.alt ?? row.id;
      console.log(`${DRY ? '[dry-run] ' : ''}${name} "${label}": ${Object.keys(changes).join(', ')}`);
      if (!DRY) await model.update({ where: { id: row.id }, data: changes });
    }
  }
  if (USERS) {
    const users = await prisma.user.findMany({ where: { email: { endsWith: '@resortnirjon.com' } } });
    for (const u of users) {
      const email = u.email.replace('@resortnirjon.com', '@pinavista.com');
      total++;
      console.log(`${DRY ? '[dry-run] ' : ''}User ${u.email} → ${email}`);
      if (!DRY) await prisma.user.update({ where: { id: u.id }, data: { email } });
    }
  } else {
    const n = await prisma.user.count({ where: { email: { endsWith: '@resortnirjon.com' } } });
    if (n) console.log(`(note) ${n} staff login(s) still use @resortnirjon.com — pass --users to move them to @pinavista.com`);
  }
  console.log(`${DRY ? 'Would change' : 'Changed'} ${total} row(s).`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
