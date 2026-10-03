'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Translated text for use inside server components (which can't call useLanguage).
 * `bn` is optional — without it the string is auto-translated when Bangla is selected.
 */
export default function T({ en, bn }: { en: string; bn?: string }) {
  const { t } = useLanguage();
  return <>{t(en, bn)}</>;
}
