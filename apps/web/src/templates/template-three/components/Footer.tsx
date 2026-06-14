'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ResortSettings } from '@/types/resort';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  settings: ResortSettings;
  logoSrc: string;
}

const NAV_LINKS = [
  { en: 'Rooms & Suites',  bn: 'রুম ও স্যুট',      href: '/rooms' },
  { en: 'Photo Gallery',   bn: 'ফটো গ্যালারি',     href: '/gallery' },
  { en: 'Nearby Spots',    bn: 'কাছের দর্শনীয় স্থান', href: '/explore' },
  { en: 'Restaurant',      bn: 'রেস্তোরাঁ',          href: '/restaurant' },
  { en: 'Stories',         bn: 'গল্পসমূহ',           href: '/blogs' },
  { en: 'Contact Us',      bn: 'যোগাযোগ করুন',       href: '/contact' },
];

export default function FooterT3({ settings, logoSrc }: Props) {
  const year = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="bg-[#020a03] border-t border-[#0f2011]">
      <div className="h-px bg-gradient-to-r from-transparent via-[#3d7a4a]/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Image src={logoSrc} alt={settings.resortName} width={48} height={48} className="rounded-full mb-5" />
            <h3 className="font-display text-2xl text-white mb-3">
              {t(settings.resortName, settings.resortNameBn || settings.resortName)}
            </h3>
            <p className="text-[#4a6e4a] text-sm leading-relaxed max-w-xs">
              {t(
                settings.aboutShort || "A nature retreat nestled in the heart of Sreemangal's tea gardens.",
                settings.aboutShortBn || 'শ্রীমঙ্গলের চা বাগানের হৃদয়ে অবস্থিত একটি প্রকৃতি আশ্রয়।'
              )}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-[#a8d4a8] text-[10px] uppercase tracking-[0.3em] mb-5 font-sans">
              {t('Explore', 'ঘুরে দেখুন')}
            </h4>
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map(({ en, bn, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-[#4a6e4a] hover:text-[#c8920c] text-sm transition-colors"
                >
                  {t(en, bn)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[#a8d4a8] text-[10px] uppercase tracking-[0.3em] mb-5 font-sans">
              {t('Connect', 'যোগাযোগ')}
            </h4>
            <div className="space-y-3">
              {settings.phone && (
                <a href={`tel:${settings.phone}`} className="block text-[#4a6e4a] hover:text-[#c8920c] text-sm transition-colors">
                  {settings.phone}
                </a>
              )}
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="block text-[#4a6e4a] hover:text-[#c8920c] text-sm transition-colors">
                  {settings.email}
                </a>
              )}
              {settings.address && (
                <p className="text-[#4a6e4a] text-sm leading-relaxed">{settings.address}</p>
              )}
            </div>

            <Link
              href="/booking"
              className="inline-block mt-8 px-7 py-3 bg-[#c8920c] text-white text-xs uppercase tracking-widest rounded-full hover:bg-[#d4a017] transition-colors"
            >
              {t('Book a Stay', 'বুকিং করুন')}
            </Link>
          </div>
        </div>

        <div className="border-t border-[#0f2011] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[#2a4a2a] text-xs font-sans">
            © {year} {t(settings.resortName, settings.resortNameBn || settings.resortName)}. {t('All rights reserved.', 'সর্বস্বত্ব সংরক্ষিত।')}
          </p>
          <p className="text-[#2a4a2a] text-xs font-sans">{t('Sreemangal, Bangladesh', 'শ্রীমঙ্গল, বাংলাদেশ')}</p>
        </div>
      </div>
    </footer>
  );
}
