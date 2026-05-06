import { cn } from '@/lib/utils';

type Props = {
  flip?: boolean;
  className?: string;
  /** Match the section *below* the wave so there is no bright seam (e.g. hero → rooms uses `stone-warm`). */
  tone?: 'cream' | 'stone-warm';
};

/** Soft organic divider between stacked sections */
export default function SectionWave({ flip = false, className, tone = 'cream' }: Props) {
  const fillClass = tone === 'stone-warm' ? 'text-stone-warm' : 'text-cream';

  return (
    <div className={cn('pointer-events-none w-full leading-none', className)} aria-hidden>
      <svg
        className={cn(
          'h-10 w-full sm:h-14',
          fillClass,
          flip && 'rotate-180'
        )}
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          d="M0,40L60,35C120,30,240,30,360,28C480,26,600,26,720,25C840,26,960,28,1080,30C1200,32,1320,34,1380,35L1440,36L1440,60L0,60Z"
        />
      </svg>
    </div>
  );
}
