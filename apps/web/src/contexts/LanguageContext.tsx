'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { translations, getTranslation, type TranslationKey } from '@/lib/translations';

type Language = 'en' | 'bn';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (en: string, bn?: string) => string;
  tr: (category: TranslationKey, key: string) => string;
  isTranslating: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// ── Google Translate (free, no key) ──────────────────────────────────────────
async function googleTranslate(texts: string[], target = 'bn'): Promise<string[]> {
  if (texts.length === 0) return [];
  // Batch as a single joined request using separator unlikely to appear in text
  const SEP = '\n⟦SEP⟧\n';
  const joined = texts.join(SEP);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(joined)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Translation failed');
  const json = await res.json();
  const full = (json[0] as [string, string][]).map(([t]) => t).join('');
  return full.split(SEP.trim());
}

// ── In-memory translation cache ───────────────────────────────────────────────
const translationCache = new Map<string, string>();

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  // Queue of English strings needing translation
  const pendingRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null;
    if (saved) setLanguageState(saved);
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    // Apply Bengali font class to body
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('lang-bn', lang === 'bn');
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('lang-bn', language === 'bn');
    }
  }, [language]);

  // Flush pending translations in a batch
  const flushPending = useCallback(async () => {
    if (pendingRef.current.size === 0) return;
    const batch = Array.from(pendingRef.current).filter(
      (text) => !translationCache.has(text)
    );
    pendingRef.current.clear();
    if (batch.length === 0) return;

    setIsTranslating(true);
    try {
      const results = await googleTranslate(batch);
      batch.forEach((src, i) => {
        if (results[i]) translationCache.set(src, results[i].trim());
      });
      forceUpdate((n) => n + 1);
    } catch {
      // fail silently — will show English
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // t(en, bn?) — if bn provided use it directly; otherwise auto-translate
  const t = useCallback((en: string, bn?: string): string => {
    if (!mounted || language === 'en') return en;
    // Provided Bengali string — use it
    if (bn && bn.trim()) return bn;
    // Check cache
    if (translationCache.has(en)) return translationCache.get(en)!;
    // Queue for translation
    if (!pendingRef.current.has(en)) {
      pendingRef.current.add(en);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flushPending, 80);
    }
    return en; // show English while translating
  }, [mounted, language, flushPending]);

  const tr = useCallback((category: TranslationKey, key: string): string => {
    if (!mounted) {
      const cat = translations[category];
      return (cat as Record<string, { en: string; bn: string }>)?.[key]?.en || key;
    }
    if (language === 'en') return getTranslation(category, key, 'en');
    // Check if we have a hardcoded Bengali translation
    const hardcoded = getTranslation(category, key, 'bn');
    const english = getTranslation(category, key, 'en');
    if (hardcoded !== english) return hardcoded; // has real Bengali
    // Otherwise auto-translate
    return t(english);
  }, [mounted, language, t]);

  // When switching to Bengali, clear cache so fresh translations load
  useEffect(() => {
    if (language === 'bn' && mounted) {
      // Trigger a re-render so pending queue fills on next render cycle
      forceUpdate((n) => n + 1);
    }
  }, [language, mounted]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tr, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
