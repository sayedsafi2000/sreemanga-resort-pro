'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { translations, getTranslation, type TranslationKey } from '@/lib/translations';

type Language = 'en' | 'bn';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (en: string, bn: string) => string;
  tr: (category: TranslationKey, key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null;
    if (saved) {
      setLanguageState(saved);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (en: string, bn: string) => {
    if (!mounted) return en;
    return language === 'bn' ? bn : en;
  };

  const tr = (category: TranslationKey, key: string) => {
    if (!mounted) {
      const cat = translations[category];
      return (cat as Record<string, { en: string; bn: string }>)?.[key]?.en || key;
    }
    return getTranslation(category, key, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}