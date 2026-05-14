import type { Metadata } from 'next';
import Image from 'next/image';
import { Utensils, ArrowRight } from 'lucide-react';
import RestaurantMenuBook from '@/components/restaurant/RestaurantMenuBook';
import Container from '@/components/ui/Container';
import DarkPageHeader from '@/templates/template-two/components/DarkPageHeader';
import { getRestaurantMenu, getSettings } from '@/lib/resort-api';
import restCollageA from '@/assets/483508909_629541966523491_8490449706697952327_n.jpg';
import restCollageB from '@/assets/482204304_622952353849119_4214375716674398722_n.jpg';
import restCollageC from '@/assets/484386239_628016673342687_4123034380849108737_n.jpg';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Restaurant',
  description:
    "Set menus for breakfast, lunch & dinner plus à la carte—hill herbs, Seven Layer Tea and garden-fresh plates at Nirjon Nature's Hideout.",
};

export default async function RestaurantPage() {
  const [menu, settings] = await Promise.all([getRestaurantMenu(), getSettings()]);
  const isT2 = settings.activeTemplate === 'template-two' || settings.activeTemplate === 'template-three';

  if (isT2) {
    const categories = [...new Set(menu.map((m) => m.category))];

    return (
      <div className="min-h-screen bg-[#09100a] pb-24">
        <DarkPageHeader
          eyebrow="Dining"
          title="Restaurant & Garden Tables"
          subtitle="Morning tea with leaf conversations, fresh lunch, and dinner by candlelight. Farm-fresh seasonal cuisine every day."
        />

        {/* Image strip */}
        <div className="border-b border-forest-900/60">
          <div className="mx-auto grid max-w-6xl grid-cols-3 gap-px px-4 sm:px-6 lg:px-8">
            {[restCollageA, restCollageB, restCollageC].map((src, i) => (
              <div key={i} className="relative aspect-[4/3] overflow-hidden">
                <Image src={src} alt="" fill className="object-cover" sizes="33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09100a]/60 to-transparent" />
              </div>
            ))}
          </div>
        </div>

        {/* Menu */}
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          {menu.length === 0 ? (
            <p className="border border-forest-900/60 bg-[#0a130b] p-12 text-center text-forest-500">
              Menu is being updated. Try again later or call us to confirm.
            </p>
          ) : (
            <div className="space-y-14">
              {categories.map((cat) => {
                const items = menu.filter((m) => m.category === cat && m.isAvailable !== false);
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <div className="mb-6 flex items-center gap-4">
                      <span className="h-px flex-1 bg-forest-900/60" />
                      <h2 className="font-display text-xl font-semibold uppercase tracking-widest text-earth-400">
                        {cat}
                      </h2>
                      <span className="h-px flex-1 bg-forest-900/60" />
                    </div>
                    <div className="divide-y divide-forest-900/40">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-6 py-5">
                          <div className="flex items-start gap-4">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-earth-400/20 bg-earth-400/5 text-earth-500">
                              <Utensils className="h-4 w-4" strokeWidth={1.5} />
                            </span>
                            <div>
                              <p className="font-semibold text-white">{item.name}</p>
                              {item.description && (
                                <p className="mt-0.5 text-sm text-forest-400/65 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 font-display text-xl font-semibold text-earth-400">
                            ৳{item.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 flex flex-col items-center gap-4 border-t border-forest-900/50 pt-10 text-center">
            <p className="text-sm text-forest-400/60">
              Set menus available for breakfast, lunch & dinner. Seven Layer Tea available all day.
            </p>
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 border border-earth-400/50 bg-earth-400/10 px-7 py-3 text-sm font-semibold uppercase tracking-widest text-earth-400 transition hover:bg-earth-400/20"
            >
              Reserve a table <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-cream via-[#ebe6dc] to-[#e3ddd2] pb-14 pt-10 sm:pt-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-gradient-to-b from-forest-900/14 via-forest-800/10 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute left-[-12%] top-36 h-[26rem] w-[26rem] rounded-full bg-forest-200/35 blur-[90px]" aria-hidden />
      <div className="pointer-events-none absolute right-[-8%] top-44 h-[22rem] w-[22rem] rounded-full bg-amber-100/50 blur-[80px]" aria-hidden />

      <Container className="relative z-[1]">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:items-center">
          <div className="text-stone-900">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.38em] text-forest-800">
              Dining · In the tea garden area
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-stone-900 sm:text-5xl lg:text-[3.35rem]">
              Restaurant & Garden Tables—curated from the menu
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-stone-700 sm:text-lg">
              Morning tea with leaf conversations, fresh lunch, and dinner by candlelight.
            </p>
            <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 text-[0.8rem] font-semibold text-forest-900 sm:flex sm:flex-wrap">
              <span className="rounded-full border border-forest-200/90 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm">Set BF / LU / DN</span>
              <span className="rounded-full border border-forest-200/90 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm">A la Carte</span>
              <span className="rounded-full border border-forest-200/90 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm">Seven Layer Tea · Herbal Flight</span>
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-stone-300/80 shadow-[0_30px_80px_-42px_rgba(0,0,0,0.2)] ring-2 ring-stone-200/90">
                <Image src={restCollageA} alt="" fill className="object-cover" sizes="(max-width:1024px) 50vw, 28vw" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/55 via-transparent to-transparent" />
                <span className="absolute bottom-4 left-4 text-[11px] font-semibold uppercase tracking-wider text-white drop-shadow-md">Morning Plate</span>
              </div>
              <div className="mt-10 space-y-3 sm:space-y-4">
                <div className="relative aspect-video overflow-hidden rounded-3xl border border-stone-300/80 shadow-[0_30px_80px_-42px_rgba(0,0,0,0.18)] ring-2 ring-stone-200/90">
                  <Image src={restCollageB} alt="" fill className="object-cover" sizes="(max-width:1024px) 50vw, 26vw" />
                </div>
                <div className="relative aspect-[16/11] overflow-hidden rounded-3xl border border-stone-300/80 shadow-[0_26px_70px_-40px_rgba(0,0,0,0.18)] ring-2 ring-stone-200/90">
                  <Image src={restCollageC} alt="" fill className="object-cover" sizes="(max-width:1024px) 50vw, 26vw" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <div className="relative z-[2] mx-auto mt-16 max-w-6xl px-4 sm:mt-24 sm:px-6 lg:mt-28">
        {menu.length === 0 ? (
          <Container>
            <p className="rounded-3xl bg-white/90 p-12 text-center text-stone-600 shadow-xl">
              Menu is being updated. Try again later or call us to confirm.
            </p>
          </Container>
        ) : (
          <RestaurantMenuBook items={menu} />
        )}
      </div>
    </div>
  );
}
