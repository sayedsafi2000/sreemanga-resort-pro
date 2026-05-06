import { cn } from '@/lib/utils';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  dark?: boolean;
  /** Adds a subtle green gradient accent under the title */
  decorate?: boolean;
  /** Optional id for the title `h2` (e.g. `aria-labelledby`). */
  headingId?: string;
};

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  dark = false,
  decorate = false,
  headingId,
}: Props) {
  return (
    <div
      className={cn(
        'mb-10 max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        align === 'left' && 'text-left'
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            'mb-2 text-xs font-semibold uppercase tracking-[0.2em]',
            dark ? 'text-forest-200/90' : 'text-forest-700 dark:text-forest-400'
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        id={headingId}
        className={cn(
          'font-display text-3xl font-semibold tracking-tight sm:text-4xl',
          dark ? 'text-white' : 'text-stone-900 dark:text-[#e4e4e3]'
        )}
      >
        {title}
      </h2>
      {decorate && (
        <span
          className={cn(
            'mt-4 block h-1.5 rounded-full',
            align === 'center' ? 'mx-auto w-20' : 'w-20',
            dark ? 'bg-gradient-to-r from-white/60 via-forest-200 to-forest-400' : 'bg-gradient-to-r from-forest-400 via-forest-600 to-forest-800'
          )}
          aria-hidden
        />
      )}
      {subtitle && (
        <p
          className={cn(
            'mt-3 text-base leading-relaxed sm:text-lg',
            dark ? 'text-forest-100/90' : 'text-stone-600 dark:text-[#a3a3a3]'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}