'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/** Admin-entered content for server components: shows `bn` in বাংলা and `en` in English (see lx()). */
export default function L({ en, bn }: { en: string | null | undefined; bn?: string | null }) {
  const { lx } = useLanguage();
  return <>{lx(en, bn)}</>;
}

/** Multi-paragraph admin text (blank line = new paragraph) in the selected language. */
export function LParagraphs({ en, bn, className }: { en: string | null | undefined; bn?: string | null; className?: string }) {
  const { lx } = useLanguage();
  const text = lx(en, bn);
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={className}>{p}</p>
      ))}
    </>
  );
}

/** Pick the Bangla list when it is filled in, otherwise the English one (used for bullet lists). */
export function useLocalizedList(en: string[] | null | undefined, bn?: string[] | null): string[] {
  const { language, lx } = useLanguage();
  const e = en ?? [];
  const b = (bn ?? []).filter(Boolean);
  if (language === 'bn' && b.length) return b;
  return e.map((line, i) => lx(line, b[i]));
}

/** Bullet list from admin text in the selected language (markup lives here because server
 *  components can't pass render functions to client components). */
export function LBullets({ en, bn, className = 'mb-8 grid gap-2 sm:grid-cols-2' }: { en: string[] | null | undefined; bn?: string[] | null; className?: string }) {
  const lines = useLocalizedList(en, bn);
  if (!lines.length) return null;
  return (
    <ul className={className}>
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm text-stone-700">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-600" aria-hidden />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
