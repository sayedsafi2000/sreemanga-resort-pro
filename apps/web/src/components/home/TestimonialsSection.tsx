'use client';

import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReveal, useRevealGroup } from '@/hooks/useReveal';
import type { Testimonial } from '@/types/resort';
import { Quote } from 'lucide-react';

type Props = {
  items: Testimonial[];
};

export default function TestimonialsSection({ items }: Props) {
  const { t, tr } = useLanguage();

  const { ref: headRef,  visible: headVisible  } = useReveal<HTMLDivElement>();
  const { ref: cardsRef, visible: cardsVisible } = useRevealGroup<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden border-y border-forest-100/90 bg-gradient-to-b from-white via-forest-50/40 to-white pt-16 pb-20 sm:pt-20 sm:pb-28 dark:border-stone-800 dark:from-[#0a0f0c] dark:via-[#0d110d] dark:to-[#0a0f0c]">
      <div className="pointer-events-none absolute right-[-20%] top-10 h-72 w-72 rounded-full bg-forest-200/40 blur-3xl dark:bg-forest-800/40" aria-hidden />
      <Container className="relative z-10">

        <div ref={headRef} className={`reveal ${headVisible ? 'visible' : ''}`}>
          <SectionHeading
            eyebrow="Stories · গল্প"
            title={tr('testimonials', 'title')}
            subtitle={t('Real evenings by the pool and slow mornings on the balcony.', 'পুল সাইডে সন্ধ্যা আর ব্যালকনিতে ধীর সকাল।')}
            decorate
          />
        </div>

        <div ref={cardsRef} className="grid gap-6 md:grid-cols-3">
          {items.map((testimonial, i) => (
            <blockquote
              key={testimonial.id}
              className={cn(
                `reveal ${cardsVisible ? 'visible' : ''}`,
                'flex h-full flex-col rounded-[1.85rem] border border-forest-100 bg-white/95 p-6 shadow-soft ring-1 ring-forest-50 transition hover:-translate-y-1',
                i === 1 ? 'md:-translate-y-2 md:shadow-lg' : ''
              )}
              style={{ transitionDelay: `${i * 110}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <Quote className="h-8 w-8 shrink-0 text-forest-400" aria-hidden />
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-forest-200 via-forest-100 to-white text-[0.62rem] font-bold uppercase tracking-wider text-forest-900 shadow-inner ring-2 ring-forest-100"
                  aria-hidden
                >
                  {testimonial.author
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)}
                </span>
              </div>
              <p className="mt-4 flex-1 leading-relaxed text-stone-700">&ldquo;{testimonial.quote}&rdquo;</p>
              <footer className="mt-6 text-sm font-semibold text-forest-900">
                {testimonial.author}
                {testimonial.role && (
                  <span className="block font-normal text-stone-500">{testimonial.role}</span>
                )}
              </footer>
            </blockquote>
          ))}
        </div>
      </Container>
    </section>
  );
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
