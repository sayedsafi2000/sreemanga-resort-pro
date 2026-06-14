'use client';

import { useReveal } from '@/hooks/useReveal';
import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  phone?: string;
  email?: string;
  address?: string;
}

export default function ContactNature({ phone, email, address }: Props) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const { t } = useLanguage();

  return (
    <section className="bg-[#0a1b0c] py-28 px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(61,122,74,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div
        ref={ref}
        className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-1000 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        <span className="text-[#3d7a4a] text-[10px] uppercase tracking-[0.35em] font-sans">{t('Get in Touch', 'যোগাযোগ করুন')}</span>
        <h2 className="font-display text-5xl md:text-7xl text-white mt-4 mb-6 leading-tight">
          {t('Begin Your', 'আপনার প্রকৃতি')}<br />{t('Nature Story', 'যাত্রা শুরু হোক')}
        </h2>
        <p className="text-[#5a8a5a] text-base mb-12 max-w-md mx-auto">
          {t("Ready to escape into the wilderness? We'd love to welcome you to our sanctuary.", 'প্রকৃতির কোলে হারিয়ে যেতে প্রস্তুত? আমরা আপনাকে আমাদের আশ্রয়ে স্বাগত জানাতে অধীর আগ্রহে অপেক্ষা করছি।')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
          <Link
            href="/booking"
            className="px-10 py-4 bg-[#c8920c] text-white text-xs uppercase tracking-[0.2em] rounded-full hover:bg-[#d4a017] transition-all hover:shadow-lg hover:shadow-[#c8920c]/25"
          >
            {t('Book Your Stay', 'আপনার থাকা বুক করুন')}
          </Link>
          <Link
            href="/contact"
            className="px-10 py-4 border border-[#3d7a4a] text-[#a8d4a8] text-xs uppercase tracking-[0.2em] rounded-full hover:border-[#c8920c] hover:text-[#c8920c] transition-colors"
          >
            {t('Send a Message', 'বার্তা পাঠান')}
          </Link>
        </div>

        {/* Contact info */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center text-[#4a6e4a]">
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-[#c8920c] transition-colors text-sm">
              <Phone className="w-4 h-4" />
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-[#c8920c] transition-colors text-sm">
              <Mail className="w-4 h-4" />
              {email}
            </a>
          )}
          {address && (
            <span className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              {address}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
