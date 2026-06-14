'use client';

import { useRevealGroup } from '@/hooks/useReveal';
import { useLanguage } from '@/contexts/LanguageContext';

const FACILITIES = [
  { emoji: '🌿', titleEn: 'Tea Garden Tours', titleBn: 'চা বাগান ভ্রমণ', descEn: 'Walk through endless lush tea plantations with expert guides', descBn: 'বিশেষজ্ঞ গাইডের সাথে অফুরন্ত সবুজ চা বাগানে হাঁটুন' },
  { emoji: '🏊', titleEn: 'Infinity Pool', titleBn: 'ইনফিনিটি পুল', descEn: 'Perched above the canopy with panoramic forest views', descBn: 'বনের ছাদের উপরে, চারদিকে অরণ্যের অসীম দৃশ্য' },
  { emoji: '🍃', titleEn: 'Organic Dining', titleBn: 'জৈব খাবার', descEn: 'Seasonal farm-to-table menus from our own kitchen garden', descBn: 'নিজস্ব রান্নাঘরের বাগান থেকে মৌসুমি তাজা খাবার' },
  { emoji: '🧖', titleEn: 'Forest Spa', titleBn: 'অরণ্য স্পা', descEn: 'Traditional Ayurvedic treatments using forest botanicals', descBn: 'বনের উদ্ভিদ দিয়ে ঐতিহ্যবাহী আয়ুর্বেদিক চিকিৎসা' },
  { emoji: '🚵', titleEn: 'Eco Trails', titleBn: 'ইকো ট্রেইল', descEn: 'Guided nature treks through protected reserve forests', descBn: 'সংরক্ষিত অরণ্যের পথে গাইডসহ প্রকৃতি অভিযান' },
  { emoji: '🌅', titleEn: 'Sunrise Watch', titleBn: 'সূর্যোদয় দর্শন', descEn: 'Dawn breaks over a sea of green tea garden terraces', descBn: 'সবুজ চা বাগানের উপর ভোরের সূর্যোদয়ের অপার্থিব দৃশ্য' },
];

export default function FacilitiesNature() {
  const { ref, visible } = useRevealGroup<HTMLDivElement>();
  const { t } = useLanguage();

  return (
    <section className="bg-[#0a1b0c] py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        {Array(12).fill(null).map((_, i) => (
          <div key={i} className="absolute left-0 right-0 h-px bg-[#3d7a4a]" style={{ top: `${(i + 1) * (100 / 13)}%` }} />
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <span className="text-[#3d7a4a] text-[10px] uppercase tracking-[0.35em] font-sans">
            {t('Facilities', 'সুবিধাসমূহ')}
          </span>
          <h2 className="font-display text-4xl md:text-5xl text-white mt-3">
            {t('What Awaits You', 'যা অপেক্ষা করছে আপনার জন্য')}
          </h2>
          <p className="text-[#5a8a5a] mt-4 max-w-lg mx-auto text-sm">
            {t('Every detail curated for a perfect communion with nature', 'প্রকৃতির সাথে নিখুঁত মিলনের জন্য প্রতিটি বিবরণ যত্নসহকারে সাজানো')}
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FACILITIES.map((f, i) => (
            <div
              key={i}
              className={`group p-7 rounded-2xl border border-[#1a3a1e] bg-[#050e05] hover:border-[#3d7a4a] hover:bg-[#0a1b0c] transition-all duration-500 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="text-3xl mb-5 transition-transform duration-300 group-hover:-translate-y-1" style={{ filter: 'drop-shadow(0 0 8px rgba(200,146,12,0.3))' }}>
                {f.emoji}
              </div>
              <h3 className="font-display text-xl text-white mb-2 group-hover:text-[#c8920c] transition-colors">
                {t(f.titleEn, f.titleBn)}
              </h3>
              <p className="text-[#4a6e4a] text-sm leading-relaxed">{t(f.descEn, f.descBn)}</p>
              <div className="mt-4 h-px bg-gradient-to-r from-[#c8920c]/0 via-[#c8920c]/40 to-[#c8920c]/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
