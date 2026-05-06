'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
      className="flex items-center gap-1.5 text-xs hover:text-amber-400 transition"
      aria-label="Toggle language"
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="font-medium">{language === 'en' ? 'EN' : 'BN'}</span>
    </button>
  );
}