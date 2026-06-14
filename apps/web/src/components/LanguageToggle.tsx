'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
  const { language, setLanguage, isTranslating } = useLanguage();
  const isBn = language === 'bn';

  return (
    <button
      onClick={() => setLanguage(isBn ? 'en' : 'bn')}
      className="group relative flex items-center gap-1 overflow-hidden rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/20"
      aria-label="Toggle language"
      title={isBn ? 'Switch to English' : 'বাংলায় পড়ুন'}
    >
      {/* Sliding pill */}
      <span
        className={`absolute inset-y-0.5 w-[calc(50%-2px)] rounded-full bg-amber-400 transition-all duration-300 ${isBn ? 'left-[calc(50%+1px)]' : 'left-0.5'}`}
      />
      <span className={`relative z-10 transition-colors duration-300 ${!isBn ? 'text-forest-900 font-bold' : 'text-white/70'}`}>
        EN
      </span>
      <span className="relative z-10 text-white/40">|</span>
      <span className={`relative z-10 transition-colors duration-300 ${isBn ? 'text-forest-900 font-bold' : 'text-white/70'}`}>
        বা
      </span>
      {/* Translating spinner */}
      {isTranslating && (
        <span className="relative z-10 ml-0.5">
          <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/30 border-t-amber-400" />
        </span>
      )}
    </button>
  );
}
