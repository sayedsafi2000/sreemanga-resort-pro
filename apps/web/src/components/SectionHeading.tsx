import { cn } from '@/lib/utils';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  dark?: boolean;
  /** Adds a short botanical accent bar under the title */
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
        align === 'left'   && 'text-left'
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            'mb-3 text-[11px] font-bold uppercase tracking-[0.25em]',
            dark ? 'text-forest-200/90' : 'text-forest-600'
          )}
        >
          {eyebrow}
        </p>
      )}

      <h2
        id={headingId}
        className={cn(
          'font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl',
          dark ? 'text-white' : 'text-stone-900'
        )}
      >
        {title}
      </h2>

      {decorate && (
        <div
          className={cn(
            'mt-4 flex items-center gap-2',
            align === 'center' && 'justify-center'
          )}
          aria-hidden
        >
          <span className="h-px w-8 rounded-full bg-forest-300/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-forest-500/70" />
          <span
            className={cn(
              'h-1 rounded-full bg-gradient-to-r from-forest-400 to-forest-700',
              align === 'center' ? 'w-16' : 'w-20'
            )}
          />
          <span className="h-1.5 w-1.5 rounded-full bg-forest-500/70" />
          <span className="h-px w-8 rounded-full bg-forest-300/70" />
        </div>
      )}

      {subtitle && (
        <p
          className={cn(
            'mt-4 text-base leading-relaxed sm:text-lg',
            dark ? 'text-forest-100/85' : 'text-stone-500'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
