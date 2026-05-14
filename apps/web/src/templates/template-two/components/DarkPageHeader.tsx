type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
};

export default function DarkPageHeader({ eyebrow, title, subtitle }: Props) {
  return (
    <div className="border-b border-forest-900/60 bg-[#060e07] px-4 pb-12 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-px w-8 bg-earth-400" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-earth-400">
            {eyebrow}
          </span>
        </div>
        <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-forest-300/60 sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
