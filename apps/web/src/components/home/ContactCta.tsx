'use client';

import Link from 'next/link';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CalendarHeart, Leaf, Sparkles } from 'lucide-react';

type Props = {
  phone: string;
  email: string;
  compactBottom?: boolean;
};

export default function ContactCta({ phone, email, compactBottom }: Props) {
  const { t, tr } = useLanguage();

  return (
    <section
      aria-label="Book your stay"
      className={cn(
        'relative z-20 w-full -mt-14 sm:-mt-20',
        compactBottom ? 'mb-6 sm:mb-8' : 'mb-16 sm:mb-20'
      )}
    >
      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden">
        <div className="relative bg-gradient-to-br from-forest-800 via-forest-900 to-forest-800 py-[1px] shadow-[0_32px_80px_-24px_rgba(20,28,23,0.5)] ring-1 ring-forest-700/50">

          <Container className="relative z-10 py-8 sm:py-10 lg:py-12">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
              <div className="text-center lg:text-left">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-500/15 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.28em] text-amber-100 backdrop-blur-md lg:mx-0 mx-auto">
                  <Sparkles className="h-3.5 w-3.5 text-amber-200" aria-hidden />
                  {tr('cta', 'book')}
                </div>
                <h2 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-cream drop-shadow-sm sm:text-5xl lg:text-[3.25rem]">
                  {tr('cta', 'title')}
                </h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-forest-100 lg:max-w-none sm:text-lg">
                  {tr('cta', 'subtitle')}
                </p>
                <ul className="mt-8 flex flex-col gap-3 text-left text-sm text-forest-50 sm:text-base lg:mx-0 mx-auto max-w-md">
                  {[
                    { icon: Leaf, en: 'Lawachara & Tea Gardens—adventure right outside your door.', bn: 'লাভাছড়া ও চা বাগান—আপনার দরজার বাইরে অভিযান।' },
                    { icon: CalendarHeart, en: 'Book by calendar—check room availability.', bn: 'ক্যালেন্ডার দিয়ে বুক করুন—রুম পরীক্ষা করুন।' },
                  ].map(({ icon: Icon, en, bn }) => (
                    <li key={en} className="flex gap-3 rounded-2xl border border-forest-600/25 bg-black/25 px-4 py-3 shadow-inner shadow-black/20 backdrop-blur-sm">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-700/40 text-forest-50 ring-1 ring-forest-500/30">
                        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                      </span>
                      <span className="pt-1.5 leading-snug text-stone-100">{t(en, bn)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto lg:mr-0">
                <div className="absolute -inset-px rounded-[1.75rem] bg-gradient-to-br from-forest-400/20 via-transparent to-amber-200/8 opacity-80 blur-md" aria-hidden />
                <div className="relative overflow-hidden rounded-[1.65rem] border border-forest-600/35 bg-forest-950/75 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:rounded-[1.85rem] sm:p-9">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-forest-600/12 blur-2xl" aria-hidden />
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-forest-200/95">{tr('cta', 'nextStep')}</p>
                  <p className="mt-2 text-center font-display text-2xl font-semibold text-cream">{tr('cta', 'reserveNow')}</p>
                  <p className="mt-2 text-center text-sm text-forest-100">{tr('cta', 'noPressure')}</p>
                  <div className="mt-8 flex flex-col gap-3">
                    <Link href="/booking" className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-forest-100 py-3.5 text-center text-base font-semibold text-forest-950 shadow-lg shadow-black/25 ring-2 ring-white/20 transition hover:bg-white hover:shadow-xl">
                      <CalendarHeart className="h-5 w-5 text-forest-700 transition group-hover:scale-105" aria-hidden />
                      {tr('cta', 'bookDates')}
                    </Link>
                    <Link href="/contact" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-forest-600/45 py-3.5 text-center text-base font-medium text-forest-100 transition hover:border-forest-400/65 hover:bg-forest-900/45">
                      {tr('cta', 'contact')}
                    </Link>
                  </div>
                  <p className="mt-6 text-center text-xs text-forest-200/75">
                    Or call{' '}
                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-medium text-cream underline underline-offset-2 hover:text-white">
                      {phone}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </Container>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" aria-hidden />
        </div>
      </div>
    </section>
  );
}