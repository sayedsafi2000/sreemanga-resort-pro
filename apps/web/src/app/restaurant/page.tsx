import type { Metadata } from 'next';
import Image from 'next/image';
import RestaurantMenuBook from '@/components/restaurant/RestaurantMenuBook';
import Container from '@/components/ui/Container';
import { getRestaurantMenu } from '@/lib/resort-api';
import restCollageA from '@/assets/483508909_629541966523491_8490449706697952327_n.jpg';
import restCollageB from '@/assets/482204304_622952353849119_4214375716674398722_n.jpg';
import restCollageC from '@/assets/484386239_628016673342687_4123034380849108737_n.jpg';

export const metadata: Metadata = {
  title: 'Restaurant',
  description:
    'Set menus for breakfast, lunch & dinner plus à la carte—hill herbs, Seven Layer Tea and garden-fresh plates at Nirjon Nature\'s Hideout.',
};

export default async function RestaurantPage() {
  const menu = await getRestaurantMenu();

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-cream via-[#ebe6dc] to-[#e3ddd2] pb-14 pt-10 sm:pt-14">
      {/* Ambient — warm paper + light forest wash (matches menu book) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-gradient-to-b from-forest-900/14 via-forest-800/10 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[-12%] top-36 h-[26rem] w-[26rem] rounded-full bg-forest-200/35 blur-[90px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-8%] top-44 h-[22rem] w-[22rem] rounded-full bg-amber-100/50 blur-[80px]"
        aria-hidden
      />

      {/* Hero */}
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
              Morning tea with leaf conversations, fresh lunch, and dinner by candlelight. Set menus are easy to enjoy—all items are updated from the admin database.
            </p>
            <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 text-[0.8rem] font-semibold text-forest-900 sm:flex sm:flex-wrap">
              <span className="rounded-full border border-forest-200/90 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm">
                Set BF / LU / DN
              </span>
              <span className="rounded-full border border-forest-200/90 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm">
                A la Carte
              </span>
              <span className="rounded-full border border-forest-200/90 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm">
                Seven Layer Tea · Herbal Flight
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-stone-300/80 shadow-[0_30px_80px_-42px_rgba(0,0,0,0.2)] ring-2 ring-stone-200/90">
                <Image
                  src={restCollageA}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 50vw, 28vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/55 via-transparent to-transparent" />
                <span className="absolute bottom-4 left-4 text-[11px] font-semibold uppercase tracking-wider text-white drop-shadow-md">
                  Morning Plate
                </span>
              </div>
              <div className="mt-10 space-y-3 sm:space-y-4">
                <div className="relative aspect-video overflow-hidden rounded-3xl border border-stone-300/80 shadow-[0_30px_80px_-42px_rgba(0,0,0,0.18)] ring-2 ring-stone-200/90">
                  <Image
                    src={restCollageB}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:1024px) 50vw, 26vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-900/45 via-transparent to-forest-900/35" />
                </div>
                <div className="relative aspect-[16/11] overflow-hidden rounded-3xl border border-stone-300/80 shadow-[0_26px_70px_-40px_rgba(0,0,0,0.18)] ring-2 ring-stone-200/90">
                  <Image
                    src={restCollageC}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:1024px) 50vw, 26vw"
                  />
                </div>
              </div>
            </div>

            {/* wood desk shadow */}
            <div
              className="pointer-events-none absolute -bottom-8 left-[6%] right-[6%] z-[-1] h-9 rounded-[100%] bg-black/30 blur-xl"
              aria-hidden
            />
          </div>
        </div>
      </Container>

      {/* Menu book */}
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
