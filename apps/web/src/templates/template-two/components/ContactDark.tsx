'use client';

import Link from 'next/link';
import { Phone, Mail, CalendarDays, ArrowRight } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

type Props = {
  phone: string;
  email: string;
};

export default function ContactDark({ phone, email }: Props) {
  const { ref, visible } = useReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section className="relative overflow-hidden bg-[#060e07] py-24 sm:py-32">
      {/* Gold accent line */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-earth-400/40 to-transparent" />

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`reveal ${visible ? 'visible' : ''}`}
        >
          {/* Eyebrow */}
          <div className="mb-6 flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-earth-400/50" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-earth-400">
              Reserve Your Stay
            </span>
            <span className="h-px w-12 bg-earth-400/50" />
          </div>

          {/* Headline */}
          <h2 className="font-display text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
            Begin your
            <br />
            <em className="not-italic text-earth-300">nature escape</em>
          </h2>

          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-forest-200/60">
            Reach out to book your stay or for any enquiries. Our team is here to craft your perfect retreat.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 bg-earth-400 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-forest-950 transition-all duration-200 hover:bg-earth-300"
            >
              <CalendarDays className="h-4 w-4" />
              Book a room
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-forest-700/60 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-forest-300 transition-all duration-200 hover:border-earth-400/50 hover:text-earth-400"
            >
              Get in touch
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Direct contact */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="flex items-center gap-3 text-sm text-forest-300/70 transition hover:text-earth-400"
            >
              <span className="flex h-9 w-9 items-center justify-center border border-forest-800/60">
                <Phone className="h-4 w-4" />
              </span>
              {phone}
            </a>
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-3 text-sm text-forest-300/70 transition hover:text-earth-400"
            >
              <span className="flex h-9 w-9 items-center justify-center border border-forest-800/60">
                <Mail className="h-4 w-4" />
              </span>
              {email}
            </a>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-earth-400/20 to-transparent" />
    </section>
  );
}
