'use client';

import Image from 'next/image';
import { Leaf, Mountain, Wind } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import aboutMain from '@/assets/484617672_630330766444611_3236540395920013731_n.jpg';
import aboutAccentA from '@/assets/488846677_644425541701800_5934371764185234027_n.jpg';
import aboutAccentB from '@/assets/505802308_693720310105656_2079549114860582276_n.jpg';

type Props = {
  aboutShort: string;
  aboutShortBn?: string;
  aboutLong: string;
  aboutLongBn?: string;
};

const highlights = [
  {
    icon: Leaf,
    title: { en: 'Plenty of green', bn: 'প্রচুর সবুজ' },
    desc: { en: 'Walking paths, balconies & open skies—away from the city noise.', bn: 'হাঁটার পথ, ব্যালকনি ও খোলা আকাশ—শহরের শব্দ থেকে দূরে।' },
  },
  {
    icon: Mountain,
    title: { en: 'Hill view', bn: 'পাহাড়ের দৃশ্য' },
    desc: { en: 'Morning mist & afternoon soft light—great for photos.', bn: 'সকালের কুয়াশা ও বিকেলের নরম আলো—ফটোগ্রাফির জন্য দারুণ।' },
  },
  {
    icon: Wind,
    title: { en: 'Clean air', bn: 'পরিষ্কার বাতাস' },
    desc: { en: 'Mountain breeze & light tea garden scent—feels good to breathe.', bn: 'পাহাড়ের বাতাস ও হালকা চা বাগানের গন্ধ—শ্বাস নিতে ভালো লাগে।' },
  },
] as const;

export default function AboutSection({ aboutShort, aboutShortBn = '', aboutLong, aboutLongBn = '' }: Props) {
  const { t, tr } = useLanguage();
  const displayAboutShort = aboutShortBn ? t(aboutShort, aboutShortBn) : aboutShort;
  const longParts = aboutLong
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  
  const displayAboutDesc = aboutLongBn ? t(aboutLong, aboutLongBn) : aboutLong;

  return (
    <section
      className="relative overflow-hidden py-12 sm:py-16"
      aria-labelledby="about-section-heading"
    >
      {/* Background: warm paper → soft sage wash */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-stone-warm via-cream to-[#e6efe4] dark:bg-gradient-to-b dark:from-night-bg dark:via-night-bg dark:to-night-bg" aria-hidden />
      <div
        className="pointer-events-none absolute -left-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-forest-200/35 blur-[100px] dark:bg-forest-900/50"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-forest-200/25 blur-[90px] dark:bg-forest-900/30"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] grain dark:opacity-[0.12]" aria-hidden />

<Container className="relative z-10">
        <SectionHeading
          eyebrow={tr('sections', 'aboutEyebrow')}
          title={tr('sections', 'aboutTitle')}
          subtitle={displayAboutShort}
          decorate
        />

        <div className="mt-8 grid items-center gap-8 lg:mt-10 lg:grid-cols-12 lg:gap-8">
          {/* Image collage */}
          <div className="relative mx-auto w-full max-w-lg pb-20 sm:pb-24 lg:col-span-7 lg:mx-0 lg:max-w-none lg:pb-10">
            <div className="relative aspect-[4/5] w-full overflow-visible sm:aspect-[5/6] lg:aspect-[6/7] lg:min-h-[min(32rem,70vh)]">
              {/* Main frame */}
              <div className="eco-ring absolute inset-[0_12%_8%_0] overflow-hidden rounded-[2.25rem] bg-stone-300 shadow-[0_28px_70px_-28px_rgba(27,94,32,0.35)] sm:inset-[0_10%_6%_0]">
                <Image
                  src={aboutMain}
                  alt="Resort surrounded by tea gardens and green hills"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 55vw"
                  priority={false}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-forest-950/50 via-forest-900/18 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/55 via-transparent to-transparent opacity-90 sm:opacity-100" />
                <p className="absolute bottom-5 left-5 right-16 max-w-[14rem] font-display text-lg font-semibold leading-snug text-white drop-shadow-md sm:bottom-7 sm:left-7 sm:text-xl">
                  by the tea garden—your peaceful retreat
                </p>
              </div>

              {/* Top-right accent */}
              <div
                className={cn(
                  'absolute right-0 top-0 z-20 w-[38%] overflow-hidden rounded-2xl border-4 border-white shadow-2xl',
                  'ring-1 ring-forest-200/60 sm:rounded-[1.35rem] sm:border-[5px]'
                )}
              >
                <div className="relative aspect-square w-full bg-stone-200">
                  <Image
                    src={aboutAccentB}
                    alt="Resort grounds and greenery"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 35vw, 22vw"
                  />
                </div>
              </div>

              {/* Bottom overlap card */}
              <div
                className={cn(
                  'absolute -bottom-1 right-[4%] z-10 w-[52%] rotate-[1.5deg] overflow-hidden rounded-2xl',
                  'border-[5px] border-cream bg-stone-200 shadow-[0_22px_50px_-12px_rgba(0,0,0,0.35)]',
                  'ring-1 ring-forest-900/10 sm:bottom-2 sm:rounded-[1.5rem]'
                )}
              >
                <div className="relative aspect-[5/4] w-full">
                  <Image
                    src={aboutAccentA}
                    alt="Outdoor spaces at the resort"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 48vw, 30vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 to-transparent" />
                </div>
              </div>

              {/* Corner badge */}
              <div className="absolute left-[2%] top-[8%] z-30 hidden rounded-full bg-white/95 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-forest-800 shadow-lg ring-1 ring-forest-100 sm:block sm:px-4 sm:py-2 sm:text-xs">
                Tea garden stay
              </div>
            </div>
          </div>

          {/* Copy + highlights */}
          <div className="space-y-8 lg:col-span-5">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 p-8 shadow-soft backdrop-blur-sm sm:rounded-[2rem] sm:p-9">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-forest-100/80 blur-3xl" aria-hidden />
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest-700">{tr('about', 'experience')}</p>
                <p className="mt-2 font-display text-xl font-semibold text-forest-950 sm:text-2xl">{tr('about', 'teaFeel')}</p>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-stone-700">
                  {displayAboutDesc.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            </div>

            <ul className="grid gap-3">
              {highlights.map(({ icon: Icon, title, desc }) => (
                <li
                  key={title.en}
                  className="flex gap-3 rounded-2xl border border-forest-100/80 bg-gradient-to-br from-white to-forest-50/45 p-4 shadow-sm ring-1 ring-forest-900/[0.04] sm:p-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-forest-100 shadow-inner">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <p className="font-display text-base font-semibold text-forest-900">{t(title.en, title.bn)}</p>
                    <p className="mt-1 text-sm leading-snug text-stone-600">{t(desc.en, desc.bn)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
