import type { MenuItem } from '@/types/resort';
import { getMenuCategoryMeta, sortCategories } from '@/lib/restaurant-menu-meta';
import SpotCoverImage from '@/components/explore/SpotCoverImage';
import { cn } from '@/lib/utils';

type Props = {
  items: MenuItem[];
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const;

function formatDescription(text: string | null | undefined) {
  if (!text) return null;
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines;
}

function slugId(cat: string) {
  return cat.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export default function RestaurantMenuBook({ items }: Props) {
  const byCategory = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  Object.values(byCategory).forEach((list) => {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  });

  const cats = sortCategories(Object.keys(byCategory));

  return (
    <div className="relative pb-24 pt-2 sm:pb-32">
      {/* Outer case — leather + gold trim */}
      <div className="relative mx-auto max-w-5xl">
        <div
          className="pointer-events-none absolute -inset-3 -z-20 rounded-[2.85rem] bg-gradient-to-br from-[#2a1810] via-[#1f1410] to-[#0f0a08] opacity-95 shadow-2xl sm:-inset-4 sm:rounded-[3.25rem]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -inset-1 -z-10 rounded-[2.6rem] bg-gradient-to-br from-amber-700/35 via-amber-900/20 to-forest-950/40 blur-[1px] sm:rounded-[3rem]"
          aria-hidden
        />

        <div className="relative overflow-hidden rounded-[2.35rem] border-[12px] border-[#2d1f16] bg-[#1a120e] shadow-[0_40px_120px_-36px_rgba(0,0,0,0.65)] sm:rounded-[2.75rem] sm:border-[14px]">
          {/* Inner page — cream paper */}
          <div className="relative m-[2px] overflow-hidden rounded-[2.05rem] border border-amber-200/25 bg-[#f4efe4] sm:rounded-[2.35rem] sm:m-[3px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,255,255,0.45),transparent_55%)]" aria-hidden />
            <div className="pointer-events-none absolute inset-0 opacity-[0.11] grain" aria-hidden />

            <div className="relative px-5 py-10 sm:px-9 sm:py-12 md:px-12 md:py-14 lg:px-16">
              {/* Spine (desktop) */}
              <div
                className="pointer-events-none absolute left-1/2 top-[10%] hidden h-[80%] w-px bg-gradient-to-b from-transparent via-stone-500/35 to-transparent md:block"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-[calc(50%-2px)] top-[10%] hidden h-[80%] w-px bg-gradient-to-b from-transparent via-white/50 to-transparent md:block"
                aria-hidden
              />

              {/* Header */}
              <header className="relative z-[1] mx-auto max-w-3xl text-center">
                <div className="mx-auto mb-5 flex justify-center gap-2" aria-hidden>
                  <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-800/50 sm:w-14" />
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.42em] text-amber-900/75">Est. menu</span>
                  <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-800/50 sm:w-14" />
                </div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.38em] text-forest-800 sm:text-sm">
                  Nirjon · Mountain kitchen
                </p>
                <h2 className="mt-3 font-display text-[2.1rem] font-semibold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl md:text-[3.1rem]">
                  Menu Book
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
Organized below by section—<strong className="font-semibold text-stone-800">Set Menu</strong> provides a full dining experience, <strong className="font-semibold text-stone-800">A la Carte</strong> is priced separately with clear descriptions. Menu is updated from admin.
                </p>

                <div className="mx-auto mt-6 flex flex-wrap justify-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-forest-900/85">
                  <span className="rounded-full border border-forest-200/90 bg-white/90 px-3 py-1.5 shadow-sm">
Local ingredients

                  Allergens—please ask

                  Seasonal menu changes
                  </span>
                </div>

                {/* Table of contents */}
                <nav
                  aria-label="Menu sections"
                  className="mt-10 rounded-2xl border border-amber-900/12 bg-white/55 px-4 py-4 shadow-inner backdrop-blur-[2px] sm:px-5"
                >
                  <p className="text-left text-[0.65rem] font-bold uppercase tracking-[0.28em] text-stone-500">At a Glance · Jump</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cats.map((cat) => {
                      const meta = getMenuCategoryMeta(cat);
                      const short = meta?.title.split('·')[0]?.trim() || meta?.title || cat;
                      return (
                        <a
                          key={cat}
                          href={`#${slugId(cat)}`}
                          className="inline-flex items-center gap-1 rounded-full border border-stone-300/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-stone-800 shadow-sm transition hover:border-forest-400/60 hover:bg-forest-50/90 hover:text-forest-900"
                        >
                          {short}
                          <span className="text-stone-400" aria-hidden>
                            ↓
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </nav>
              </header>

              <div className="relative z-[1] mt-14 space-y-16 md:mt-16 md:space-y-20">
                {cats.map((cat, catIndex) => {
                  const meta = getMenuCategoryMeta(cat);
                  const list = byCategory[cat];
                  const isSetMenu =
                    cat.includes('SET_BREAKFAST') || cat.includes('SET_LUNCH') || cat.includes('SET_DINNER');
                  const chapter = ROMAN[Math.min(catIndex, ROMAN.length - 1)];

                  return (
                    <section key={cat} id={slugId(cat)} className="scroll-mt-28">
                      <div className="mb-8 md:mb-10">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-800/25 bg-gradient-to-br from-amber-50 to-amber-100/80 font-display text-xl font-semibold text-amber-950 shadow-sm sm:h-16 sm:w-16 sm:text-2xl">
                            {chapter}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-display text-2xl font-semibold tracking-tight text-stone-900 sm:text-[1.85rem] md:text-[2rem]">
                              {meta?.title}
                            </h3>
                            {meta?.blurb ? (
                              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600 sm:text-[0.95rem]">
                                {meta.blurb}
                              </p>
                            ) : null}
                            <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
                              {cat.replace(/^\d+_/, '').replace(/_/g, ' · ')}
                            </p>
                          </div>
                        </div>
                        <div className="mt-6 h-px w-full bg-gradient-to-r from-amber-900/25 via-stone-400/35 to-transparent" />
                      </div>

                      {isSetMenu ? (
                        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
                          {list.map((item) => (
                            <SetMenuCard key={item.id} item={item} />
                          ))}
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4">
                          {list.map((item) => (
                            <ALaCarteRow key={item.id} item={item} />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              <footer className="relative z-[1] mt-16 border-t border-amber-900/18 pt-9 text-center">
                <p className="mx-auto max-w-2xl text-xs leading-relaxed text-stone-500 sm:text-sm">
                  Service charge & tax apply where indicated. Please inform us of any dietary restrictions or specific ingredients to avoid—we'll try our best to accommodate.
                </p>
                <p className="mt-4 font-display text-xs font-semibold uppercase tracking-[0.35em] text-amber-900/50">
                  Thank you · Enjoy your meal
                </p>
              </footer>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute -bottom-8 left-[6%] right-[6%] z-[-1] h-10 rounded-[100%] bg-black/25 blur-2xl"
          aria-hidden
        />
      </div>
    </div>
  );
}

function SetMenuCard({ item }: { item: MenuItem }) {
  const lines = formatDescription(item.description);
  const hasImage = Boolean(item.image);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-amber-900/18 bg-gradient-to-b from-[#fffdf9] to-[#faf6ee] shadow-[0_20px_50px_-28px_rgba(45,31,22,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-white/80 transition hover:border-forest-700/22 hover:shadow-[0_28px_60px_-30px_rgba(27,94,32,0.18)] md:min-h-[240px]">
      <span className="absolute left-4 top-4 z-[2] rounded-full border border-amber-800/20 bg-amber-100/95 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-amber-950 shadow-sm">
        Set menu
      </span>
      {hasImage ? (
        <div className="relative aspect-[2.1/1] w-full overflow-hidden bg-stone-200 md:aspect-[2.2/1]">
          <SpotCoverImage
            src={item.image as string}
            alt=""
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 42vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2d1f16]/70 via-[#2d1f16]/15 to-transparent" />
        </div>
      ) : (
        <div className="h-2 bg-gradient-to-r from-forest-700/15 via-amber-600/20 to-forest-700/15" aria-hidden />
      )}

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1 border-b border-dotted border-stone-400/70 pb-3">
          <h4 className="max-w-[85%] font-display text-lg font-semibold leading-snug text-stone-900 sm:text-xl">
            {item.name}
          </h4>
          <span className="rounded-md bg-forest-900/5 px-2 py-0.5 font-display text-lg font-semibold tabular-nums text-forest-900 sm:text-xl">
            ${Number(item.price).toLocaleString()}
          </span>
        </div>

        {lines && lines.length > 0 ? (
          <ul className="mt-4 flex-1 space-y-2 text-[0.9rem] leading-relaxed text-stone-700 sm:text-sm">
            {lines.map((line, i) => (
              <li
                key={i}
                className={cn(
                  line.includes('উপস্থাপনে') || line.startsWith('—') || line.startsWith('-—')
                    ? 'font-semibold text-forest-900'
                    : 'pl-0'
                )}
              >
                {line.includes('·') || line.startsWith('—') ? null : (
                  <span className="mr-1.5 inline-block h-1 w-1 translate-y-[-0.15em] rounded-full bg-forest-500/50" aria-hidden />
                )}
                {line.trim()}
              </li>
            ))}
          </ul>
        ) : item.description ? (
          <p className="mt-4 flex-1 text-sm leading-relaxed text-stone-700">{item.description}</p>
        ) : (
          <p className="mt-4 flex-1 text-sm italic text-stone-400">Description coming soon.</p>
        )}
      </div>
    </article>
  );
}

function ALaCarteRow({ item }: { item: MenuItem }) {
  const lines = formatDescription(item.description);
  const hasImage = Boolean(item.image);

  return (
    <article className="group flex gap-4 rounded-xl border border-stone-300/70 bg-white/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition hover:border-forest-600/25 hover:bg-white hover:shadow-md sm:gap-4 sm:p-4">
      {hasImage ? (
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-stone-200 ring-1 ring-stone-300/80 sm:h-[5.25rem] sm:w-[5.25rem]">
          <SpotCoverImage
            src={item.image as string}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="84px"
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        {/* Dot-leader row: name ……… price */}
        <div className="flex items-end gap-2">
          <h4 className="min-w-0 shrink font-display text-base font-semibold leading-snug text-stone-900 sm:text-[1.05rem]">
            {item.name}
          </h4>
          <span
            className="mb-1.5 min-w-[1rem] flex-1 border-b border-dotted border-stone-400/80"
            aria-hidden
          />
          <span className="shrink-0 font-display text-base font-semibold tabular-nums text-forest-900 sm:text-lg">
            ${Number(item.price).toLocaleString()}
          </span>
        </div>

        {lines && lines.length > 0 ? (
          <ul className="mt-2 space-y-1 text-[0.82rem] leading-relaxed text-stone-600 sm:text-sm">
            {lines.map((line, i) => (
              <li key={i} className="text-balance">
                {line.trim()}
              </li>
            ))}
          </ul>
        ) : item.description ? (
          <p className="mt-2 text-[0.82rem] leading-relaxed text-stone-600 sm:text-sm">{item.description}</p>
        ) : null}
      </div>
    </article>
  );
}
