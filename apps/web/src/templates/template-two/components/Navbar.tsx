'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, CalendarDays } from 'lucide-react';
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

export default function NavbarT2({ resortName, resortNameBn = '', phone, email, logoSrc }: Props) {
  const { t, tr: translate } = useLanguage();
  const displayName = resortNameBn ? t(resortName, resortNameBn) : resortName;
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
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
      <div
        className={cn(
          'transition-all duration-500',
          !isHome
            ? 'border-b border-forest-800/60 bg-[#09100a]'
            : scrolled
            ? 'border-b border-forest-800/60 bg-[#09100a]'
            : 'bg-forest-950/80 backdrop-blur-md'
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <span className="relative h-9 w-9 shrink-0 overflow-hidden border border-earth-400/30">
              <Image
                src={logoSrc}
                alt={`${displayName} logo`}
                fill
                className="object-cover"
                sizes="36px"
              />
            </span>
            <div className="hidden sm:block">
              <span className="font-display text-sm font-semibold tracking-wide text-white">
                {displayName}
              </span>
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-earth-400/80">
                Eco Resort
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all duration-200',
                  pathname === link.href
                    ? 'text-earth-400'
                    : 'text-forest-200/70 hover:text-white'
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/booking"
              className="hidden items-center gap-1.5 border border-earth-400 bg-earth-400 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-forest-950 transition-all duration-200 hover:bg-earth-300 sm:inline-flex"
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {translate('nav', 'book')}
            </Link>
            <button
              className="flex h-9 w-9 items-center justify-center border border-forest-800/60 text-forest-200 transition hover:border-forest-600 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-forest-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-72 flex-col bg-[#060e07] border-l border-forest-900/60">
            <div className="flex items-center justify-between border-b border-forest-900/60 p-5">
              <span className="font-display text-sm font-semibold text-white">{displayName}</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center border border-forest-800/60 text-forest-300 transition hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'border-b border-forest-900/40 px-4 py-4 text-xs font-semibold uppercase tracking-widest transition-colors',
                      pathname === link.href
                        ? 'text-earth-400'
                        : 'text-forest-300/70 hover:text-white'
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              <div className="mt-6">
                <Link
                  href="/booking"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center justify-center gap-2 bg-earth-400 py-3.5 text-xs font-semibold uppercase tracking-widest text-forest-950"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {translate('nav', 'book')}
                </Link>
              </div>
            </nav>

            <div className="border-t border-forest-900/60 p-5 space-y-2 text-xs text-forest-400/70">
              <p>{phone}</p>
              <p>{email}</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
