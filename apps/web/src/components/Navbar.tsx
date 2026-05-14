'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Phone, Mail, X, CalendarDays, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  resortName: string;
  resortNameBn?: string;
  phone: string;
  email: string;
  logoSrc: string;
};

export default function Navbar({ resortName, resortNameBn = '', phone, email, logoSrc }: Props) {
  const { t, tr: translate } = useLanguage();
  const displayName = resortNameBn ? t(resortName, resortNameBn) : resortName;
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const lookSolid = scrolled || !isHome;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navLinks = [
    { name: translate('nav', 'home'),       href: '/' },
    { name: translate('nav', 'rooms'),      href: '/rooms' },
    { name: translate('nav', 'explore'),    href: '/explore' },
    { name: translate('nav', 'blog'),       href: '/blogs' },
    { name: translate('nav', 'restaurant'), href: '/restaurant' },
    { name: translate('nav', 'gallery'),    href: '/gallery' },
    { name: translate('nav', 'contact'),    href: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50">
      {/* ── Top info bar ───────────────────────────────────────────────────── */}
      <div
        className={cn(
          'hidden border-b border-forest-800/40 sm:block transition-all duration-300',
          lookSolid
            ? 'bg-forest-950 text-forest-100'
            : 'bg-forest-950/90 text-forest-100 backdrop-blur-md'
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 text-forest-200/80">
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="flex items-center gap-1.5 transition hover:text-forest-50"
            >
              <Phone className="h-3 w-3" aria-hidden />
              {phone}
            </a>
            <span className="hidden text-forest-700 sm:block">·</span>
            <a
              href={`mailto:${email}`}
              className="hidden items-center gap-1.5 transition hover:text-forest-50 md:flex"
            >
              <Mail className="h-3 w-3" aria-hidden />
              {email}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-forest-400">
              <Leaf className="h-3 w-3 text-forest-400" aria-hidden />
              <span className="text-[11px] uppercase tracking-widest text-forest-400">Eco Resort · Sreemangal</span>
            </span>
            <span className="h-3 w-px bg-forest-700" />
            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* ── Main nav ───────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'transition-all duration-300',
          lookSolid
            ? 'border-b border-forest-100/80 bg-white shadow-[0_1px_12px_rgba(82,114,82,0.08)] backdrop-blur-sm'
            : 'bg-forest-950/30 backdrop-blur-md'
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <span
              className={cn(
                'relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full transition-all duration-200',
                lookSolid
                  ? 'bg-forest-100 ring-1 ring-forest-200'
                  : 'bg-white/90 shadow-card ring-1 ring-white/50'
              )}
            >
              <Image
                src={logoSrc}
                alt={`${displayName} logo`}
                fill
                className="object-cover"
                sizes="40px"
              />
            </span>
            <div className="hidden sm:block">
              <span
                className={cn(
                  'font-display text-base font-semibold leading-tight transition-colors',
                  lookSolid ? 'text-forest-900' : 'text-white'
                )}
              >
                {displayName}
              </span>
              <p
                className={cn(
                  'text-[10px] font-medium uppercase tracking-widest transition-colors',
                  lookSolid ? 'text-forest-500' : 'text-forest-200/80'
                )}
              >
                Eco Resort
              </p>
            </div>
            {/* Mobile-only name */}
            <span
              className={cn(
                'font-display text-base font-semibold transition-colors sm:hidden',
                lookSolid ? 'text-forest-900' : 'text-white'
              )}
            >
              {displayName}
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
                  pathname === link.href
                    ? lookSolid
                      ? 'bg-forest-100 text-forest-900'
                      : 'bg-white/15 text-white'
                    : lookSolid
                      ? 'text-forest-600 hover:bg-forest-50 hover:text-forest-900'
                      : 'text-forest-100/90 hover:bg-white/10 hover:text-white'
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right: CTA + hamburger */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/booking"
              className={cn(
                'hidden items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] sm:inline-flex',
                lookSolid
                  ? 'bg-forest-800 text-white shadow-sm hover:bg-forest-700 hover:shadow-md'
                  : 'bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md hover:bg-white/25'
              )}
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              {translate('nav', 'book')}
            </Link>

            <button
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 lg:hidden',
                lookSolid
                  ? 'bg-forest-50 text-forest-800 hover:bg-forest-100'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-forest-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative ml-auto flex h-full w-72 flex-col bg-forest-950 shadow-panel">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-forest-800/60 p-5">
              <div className="flex items-center gap-2.5">
                <span className="relative h-8 w-8 overflow-hidden rounded-full bg-forest-800">
                  <Image src={logoSrc} alt={displayName} fill className="object-cover" sizes="32px" />
                </span>
                <span className="font-display text-sm font-semibold text-white">{displayName}</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-800/60 text-forest-100 transition hover:bg-forest-700"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150',
                      pathname === link.href
                        ? 'bg-forest-800 text-white'
                        : 'text-forest-100/90 hover:bg-forest-800/50 hover:text-white'
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              {/* Book CTA in drawer */}
              <div className="mt-6">
                <Link
                  href="/booking"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest-100 py-3.5 text-sm font-semibold text-forest-950 shadow-sm transition hover:bg-white"
                >
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  {translate('nav', 'book')}
                </Link>
              </div>
            </nav>

            {/* Footer contact */}
            <div className="border-t border-forest-800/60 p-5 space-y-2.5">
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="flex items-center gap-2.5 text-sm text-forest-100/80 transition hover:text-white"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-800/70">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                {phone}
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2.5 text-sm text-forest-100/80 transition hover:text-white"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-800/70">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                {email}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
