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
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ResortSettings } from '@/types/resort';

type NavCol = { title: string; titleBn?: string; links: { label: string; labelBn?: string; href: string }[] };

const navColumns: NavCol[] = [
  {
    title: 'Stay',
    titleBn: 'থাকা',
    links: [
      { label: 'Rooms', labelBn: 'রুম', href: '/rooms' },
      { label: 'Book', labelBn: 'বুক করুন', href: '/booking' },
    ],
  },
  {
    title: 'Discover',
    titleBn: 'আবিষ্কার',
    links: [
      { label: 'Explore', labelBn: 'ঘুরে দেখুন', href: '/explore' },
      { label: 'Blog', labelBn: 'ব্লগ', href: '/blogs' },
      { label: 'Restaurant', labelBn: 'রেস্তোরাঁ', href: '/restaurant' },
      { label: 'Gallery', labelBn: 'গ্যালারি', href: '/gallery' },
    ],
  },
  {
    title: 'Resort',
    titleBn: 'রিসোর্ট',
    links: [
      { label: 'Home', labelBn: 'হোম', href: '/' },
      { label: 'Contact', labelBn: 'যোগাযোগ', href: '/contact' },
    ],
  },
];

export default function Footer({ settings, logoSrc }: { settings: ResortSettings; logoSrc: string }) {
  const { t } = useLanguage();
  const { resortName, resortNameBn, tagline, taglineBn, aboutShort, aboutShortBn, address, phone, email, social, mapEmbedUrl } = settings;
  const displayName = resortNameBn ? t(resortName, resortNameBn) : resortName;
  const displayTagline = taglineBn ? t(tagline, taglineBn) : tagline;
  const displayAbout = aboutShortBn ? t(aboutShort, aboutShortBn) : aboutShort;
  const telHref = `tel:${phone.replace(/\s/g, '')}`;
  const hasSocial = Boolean(social.facebook || social.instagram || social.youtube);

  return (
    <footer className="border-t border-forest-800 bg-forest-950 text-forest-50">
      <Container className="py-8 sm:py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          {/* Brand */}
          <div className="max-w-sm shrink-0">
            <div className="flex items-center gap-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-forest-800 ring-2 ring-forest-500/45">
                <Image src={logoSrc} alt={`${displayName} logo`} fill className="object-cover" sizes="48px" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-white sm:text-xl">{displayName}</p>
                <p className="text-sm font-medium text-white">{displayTagline}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-forest-100/90">{displayAbout}</p>
          </div>

          {/* Nav */}
          <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:max-w-lg">
            {navColumns.map((col) => (
              <div key={col.title}>
                <h3 className="font-display text-sm font-semibold text-white">
                  {t(col.title, col.titleBn || col.title)}
                </h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-forest-100/95 underline-offset-2 hover:text-white hover:underline"
                      >
                        {t(link.label, link.labelBn || link.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="max-w-xs shrink-0 text-sm">
            <h3 className="font-display text-sm font-semibold text-white">Contact</h3>
            <ul className="mt-3 space-y-3 text-forest-100/95">
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest-400" aria-hidden />
                <span className="leading-snug">{address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-forest-400" aria-hidden />
                <a href={telHref} className="font-medium text-white hover:underline">
                  {phone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-forest-400" aria-hidden />
                <a href={`mailto:${email}`} className="break-all hover:text-white hover:underline">
                  {email}
                </a>
              </li>
            </ul>
            {mapEmbedUrl?.trim() ? (
              <Link
                href="/contact#map"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-forest-300 hover:text-white"
              >
                Map
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>

        {/* Actions + social */}
        <div className="mt-8 flex flex-col gap-4 border-t border-forest-800/90 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/booking"
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest-100 px-4 py-2 text-sm font-semibold text-forest-950 hover:bg-white"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              Book
            </Link>
            <a
              href={telHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-forest-600/70 bg-forest-900 px-4 py-2 text-sm font-semibold text-forest-50 hover:bg-forest-800"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Call
            </a>
          </div>

          {hasSocial ? (
            <div className="flex flex-wrap gap-2">
              {social.facebook && (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-forest-600 bg-forest-900 text-forest-100 hover:border-forest-500 hover:bg-forest-800 hover:text-white"
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-forest-600 bg-forest-900 text-forest-100 hover:border-forest-500 hover:bg-forest-800 hover:text-white"
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-forest-600 bg-forest-900 text-forest-100 hover:border-forest-500 hover:bg-forest-800 hover:text-white"
                  aria-label="YouTube"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              )}
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-forest-400 sm:text-left">
          © {new Date().getFullYear()} <span className="text-forest-100">{resortName}</span> · Sreemangal, Bangladesh
        </p>
      </Container>
    </footer>
  );
}
