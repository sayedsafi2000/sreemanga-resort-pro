'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Phone, Mail, X } from 'lucide-react';
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

  const navLinks = [
    { name: translate('nav', 'home'), href: '/' },
    { name: translate('nav', 'rooms'), href: '/rooms' },
    { name: translate('nav', 'explore'), href: '/explore' },
    { name: translate('nav', 'blog'), href: '/blogs' },
    { name: translate('nav', 'restaurant'), href: '/restaurant' },
    { name: translate('nav', 'gallery'), href: '/gallery' },
    { name: translate('nav', 'contact'), href: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div
        className={cn(
          'hidden border-b border-forest-800/50 sm:block transition-colors duration-300',
          lookSolid ? 'bg-forest-950 text-forest-50' : 'bg-forest-950/92 text-forest-50 backdrop-blur-md'
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-xs sm:px-6 lg:px-8">
          <span className="flex items-center gap-1.5 opacity-95">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:underline">{phone}</a>
          </span>
          <span className="flex items-center gap-4">
            <LanguageToggle />
            <a href={`mailto:${email}`} className="flex items-center gap-1.5 opacity-95 hover:underline">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {email}
            </a>
          </span>
        </div>
      </div>

      <div
        className={cn(
          'transition-all duration-300',
          lookSolid
            ? 'border-b border-forest-100/90 bg-white dark:bg-[#0a0f0c] dark:border-stone-800 shadow-soft backdrop-blur-md'
            : 'bg-forest-950/40 backdrop-blur-md'
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span
              className={cn(
                'relative h-10 w-10 overflow-hidden rounded-full transition-colors',
                lookSolid ? 'bg-forest-100' : 'bg-white/90 shadow-card'
              )}
            >
              <Image src={logoSrc} alt={`${displayName} logo`} fill className="object-cover" sizes="40px" />
            </span>
            <span
              className={cn(
                'font-display text-lg font-semibold transition-colors',
                lookSolid ? 'text-forest-900' : 'text-white'
              )}
            >
              {displayName}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex lg:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors lg:px-4',
                  pathname === link.href
                    ? 'bg-forest-100 text-forest-900'
                    : lookSolid
                      ? 'text-forest-700 hover:bg-forest-50 hover:text-forest-900'
                      : 'text-forest-100 hover:bg-forest-800 hover:text-white'
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <button
            className={cn('block sm:hidden', lookSolid ? 'text-forest-900' : 'text-white')}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-forest-950/95 backdrop-blur-md sm:hidden">
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center justify-end">
              <button onClick={() => setMobileOpen(false)} className="p-2 text-white" aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-lg px-4 py-3 text-lg font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-forest-800 text-white'
                      : 'text-forest-100 hover:bg-forest-800/50'
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}