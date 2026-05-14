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

export default function NavbarT3({ resortName, resortNameBn = '', logoSrc }: Props) {
  const { t, tr: translate } = useLanguage();
  const displayName = resortNameBn ? t(resortName, resortNameBn) : resortName;
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Desktop floating pill */}
      <div
        className={cn(
          'hidden md:flex items-center justify-between transition-all duration-500',
          scrolled
            ? 'mt-3 mx-6 px-6 py-3 rounded-full bg-[#030d04]/95 backdrop-blur-xl border border-[#1a3a1e]/80 shadow-2xl shadow-black/40'
            : 'px-10 py-6 bg-transparent',
        )}
      >
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image src={logoSrc} alt={resortName} width={34} height={34} className="rounded-full" />
          <span className="font-display text-lg text-white">{displayName}</span>
        </Link>

        <nav className="flex items-center gap-5 xl:gap-7">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-[11px] uppercase tracking-[0.18em] font-sans transition-colors',
                pathname === link.href ? 'text-[#c8920c]' : 'text-white/65 hover:text-white',
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <LanguageToggle />
          <Link
            href="/booking"
            className="flex items-center gap-1.5 px-5 py-2 bg-[#c8920c] text-white text-[11px] uppercase tracking-widest rounded-full hover:bg-[#d4a017] transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Book
          </Link>
        </div>
      </div>

      {/* Mobile bar */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 bg-[#030d04]/95 backdrop-blur-xl border-b border-[#0f2011]">
        <Link href="/" className="flex items-center gap-2">
          <Image src={logoSrc} alt={resortName} width={28} height={28} className="rounded-full" />
          <span className="font-display text-white text-sm">{displayName}</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1" aria-label="Menu">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          'md:hidden fixed inset-0 bg-[#030d04] z-40 pt-[60px] transition-transform duration-400',
          mobileOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <nav className="flex flex-col gap-1 px-6 pt-8">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'font-display text-3xl py-3 border-b border-[#0f2011] transition-colors',
                pathname === link.href ? 'text-[#c8920c]' : 'text-white hover:text-[#c8920c]',
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>
        <div className="px-6 mt-8">
          <Link
            href="/booking"
            onClick={() => setMobileOpen(false)}
            className="block text-center py-4 bg-[#c8920c] text-white uppercase tracking-widest text-sm rounded-full"
          >
            Book Your Stay
          </Link>
        </div>
      </div>
    </header>
  );
}
