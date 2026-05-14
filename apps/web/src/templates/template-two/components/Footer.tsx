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
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ResortSettings } from '@/types/resort';

const navLinks = [
  { label: 'Home',       href: '/' },
  { label: 'Rooms',      href: '/rooms' },
  { label: 'Explore',    href: '/explore' },
  { label: 'Blogs',      href: '/blogs' },
  { label: 'Restaurant', href: '/restaurant' },
  { label: 'Gallery',    href: '/gallery' },
  { label: 'Contact',    href: '/contact' },
  { label: 'Book',       href: '/booking' },
];

export default function FooterT2({
  settings,
  logoSrc,
}: {
  settings: ResortSettings;
  logoSrc: string;
}) {
  const { resortName, address, phone, email, social, tagline } = settings;
  const telHref = `tel:${phone.replace(/\s/g, '')}`;
  const hasSocial = Boolean(social.facebook || social.instagram || social.youtube);

  return (
    <footer className="border-t border-forest-900/60 bg-[#040b05] text-forest-100">
      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3">

          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-3">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden border border-earth-400/30">
                <Image src={logoSrc} alt={resortName} fill className="object-cover" sizes="40px" />
              </span>
              <div>
                <p className="font-display text-base font-semibold text-white">{resortName}</p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-earth-400/70">
                  Eco Resort · Sreemangal
                </p>
              </div>
            </Link>

            <p className="mt-5 text-sm leading-relaxed text-forest-300/55">
              {tagline}
            </p>

            {hasSocial && (
              <div className="mt-5 flex gap-2">
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex h-9 w-9 items-center justify-center border border-forest-800/60 text-forest-500 transition hover:border-earth-400/40 hover:text-earth-400"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex h-9 w-9 items-center justify-center border border-forest-800/60 text-forest-500 transition hover:border-earth-400/40 hover:text-earth-400"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {social.youtube && (
                  <a
                    href={social.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="flex h-9 w-9 items-center justify-center border border-forest-800/60 text-forest-500 transition hover:border-earth-400/40 hover:text-earth-400"
                  >
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-5 text-[9px] font-semibold uppercase tracking-[0.35em] text-earth-400">
              Navigation
            </h3>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-forest-400/70 transition hover:text-earth-400"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:opacity-100" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-5 text-[9px] font-semibold uppercase tracking-[0.35em] text-earth-400">
              Contact
            </h3>
            <ul className="space-y-4 text-sm text-forest-300/65">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-earth-500/60" />
                <span className="leading-snug">{address}</span>
              </li>
              <li>
                <a href={telHref} className="flex items-center gap-3 transition hover:text-earth-400">
                  <Phone className="h-4 w-4 shrink-0 text-earth-500/60" />
                  {phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="flex items-center gap-3 transition hover:text-earth-400">
                  <Mail className="h-4 w-4 shrink-0 text-earth-500/60" />
                  {email}
                </a>
              </li>
            </ul>

            <Link
              href="/booking"
              className="mt-7 inline-flex items-center gap-2 border border-earth-400/50 bg-earth-400/10 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-earth-400 transition hover:bg-earth-400/20"
            >
              Book a stay
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-forest-900/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-700">
            © {new Date().getFullYear()} {resortName} · All rights reserved
          </p>
          <p className="text-[10px] text-forest-800">
            Sreemangal, Moulvibazar, Bangladesh
          </p>
        </div>
      </div>
    </footer>
  );
}
