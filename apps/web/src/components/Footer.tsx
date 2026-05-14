'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  CalendarDays,
  Leaf,
  ArrowRight,
} from 'lucide-react';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ResortSettings } from '@/types/resort';

type NavCol = {
  title: string;
  titleBn?: string;
  links: { label: string; labelBn?: string; href: string }[];
};

const navColumns: NavCol[] = [
  {
    title: 'Stay',
    titleBn: 'থাকা',
    links: [
      { label: 'Rooms',   labelBn: 'রুম',       href: '/rooms' },
      { label: 'Book',    labelBn: 'বুক করুন',  href: '/booking' },
    ],
  },
  {
    title: 'Discover',
    titleBn: 'আবিষ্কার',
    links: [
      { label: 'Explore',    labelBn: 'ঘুরে দেখুন', href: '/explore' },
      { label: 'Blog',       labelBn: 'ব্লগ',        href: '/blogs' },
      { label: 'Restaurant', labelBn: 'রেস্তোরাঁ',  href: '/restaurant' },
      { label: 'Gallery',    labelBn: 'গ্যালারি',   href: '/gallery' },
    ],
  },
  {
    title: 'Resort',
    titleBn: 'রিসোর্ট',
    links: [
      { label: 'Home',    labelBn: 'হোম',       href: '/' },
      { label: 'Contact', labelBn: 'যোগাযোগ',   href: '/contact' },
    ],
  },
];

export default function Footer({
  settings,
  logoSrc,
}: {
  settings: ResortSettings;
  logoSrc: string;
}) {
  const { t } = useLanguage();
  const {
    resortName,
    resortNameBn,
    tagline,
    taglineBn,
    aboutShort,
    aboutShortBn,
    address,
    phone,
    email,
    social,
    mapEmbedUrl,
  } = settings;

  const displayName    = resortNameBn ? t(resortName, resortNameBn)     : resortName;
  const displayTagline = taglineBn    ? t(tagline,    taglineBn)         : tagline;
  const displayAbout   = aboutShortBn ? t(aboutShort, aboutShortBn)     : aboutShort;
  const telHref        = `tel:${phone.replace(/\s/g, '')}`;
  const hasSocial      = Boolean(social.facebook || social.instagram || social.youtube);

  return (
    <footer className="border-t border-forest-800/60 bg-forest-950 text-forest-50">
      {/* ── Top strip: nature badge ───────────────────────────────────────── */}
      <div className="border-b border-forest-800/40">
        <Container className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2 text-forest-400">
            <Leaf className="h-4 w-4 flex-shrink-0 text-forest-500" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-forest-400">
              Eco Resort · Sreemangal, Bangladesh
            </span>
          </div>
          <Link
            href="/booking"
            className="hidden items-center gap-1.5 rounded-full bg-forest-100/10 px-4 py-1.5 text-xs font-semibold text-forest-200 ring-1 ring-forest-700/50 transition hover:bg-forest-100/20 hover:text-white sm:flex"
          >
            Book a stay
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Container>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <Container className="py-10 sm:py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
          {/* Brand */}
          <div className="max-w-sm shrink-0">
            <div className="flex items-center gap-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-forest-800 ring-2 ring-forest-600/50">
                <Image
                  src={logoSrc}
                  alt={`${displayName} logo`}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </span>
              <div>
                <p className="font-display text-lg font-semibold leading-tight text-white">
                  {displayName}
                </p>
                <p className="mt-0.5 text-xs font-medium text-forest-400">
                  {displayTagline}
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-forest-200/80">
              {displayAbout}
            </p>

            {/* Social */}
            {hasSocial && (
              <div className="mt-5 flex gap-2">
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-700/70 bg-forest-900/60 text-forest-300 transition hover:border-forest-500 hover:bg-forest-800 hover:text-white"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-700/70 bg-forest-900/60 text-forest-300 transition hover:border-forest-500 hover:bg-forest-800 hover:text-white"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {social.youtube && (
                  <a
                    href={social.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-700/70 bg-forest-900/60 text-forest-300 transition hover:border-forest-500 hover:bg-forest-800 hover:text-white"
                    aria-label="YouTube"
                  >
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Nav columns */}
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
            {navColumns.map((col) => (
              <div key={col.title}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-forest-400">
                  {t(col.title, col.titleBn || col.title)}
                </h3>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group flex items-center gap-1 text-sm text-forest-100/80 transition hover:text-white"
                      >
                        <span className="h-px w-0 bg-forest-500 transition-all group-hover:w-3" />
                        {t(link.label, link.labelBn || link.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="shrink-0 lg:w-56">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-forest-400">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-forest-200/85">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" aria-hidden />
                <span className="leading-snug">{address}</span>
              </li>
              <li>
                <a
                  href={telHref}
                  className="flex items-center gap-2.5 transition hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0 text-forest-500" aria-hidden />
                  <span className="font-medium text-white">{phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${email}`}
                  className="flex items-start gap-2.5 transition hover:text-white"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" aria-hidden />
                  <span className="break-all">{email}</span>
                </a>
              </li>
            </ul>
            {mapEmbedUrl?.trim() && (
              <Link
                href="/contact#map"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-forest-400 transition hover:text-forest-200"
              >
                View on map
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* ── CTA row ──────────────────────────────────────────────────────── */}
        <div className="mt-10 flex flex-col gap-4 border-t border-forest-800/50 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest-100 px-5 py-2.5 text-sm font-semibold text-forest-950 shadow-sm transition hover:bg-white hover:shadow-md"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              Book Your Stay
            </Link>
            <a
              href={telHref}
              className="inline-flex items-center gap-1.5 rounded-xl border border-forest-600/60 bg-forest-900/60 px-5 py-2.5 text-sm font-semibold text-forest-50 transition hover:bg-forest-800"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Call Us
            </a>
          </div>

          <p className="text-xs text-forest-600">
            © {new Date().getFullYear()}{' '}
            <span className="text-forest-300">{resortName}</span>
            {' · '}All rights reserved
          </p>
        </div>
      </Container>
    </footer>
  );
}
