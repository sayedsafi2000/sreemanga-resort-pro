import * as React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/ui/sparkline';

export type StatAccent = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'teal';

const ACCENT_HEX: Record<StatAccent, string> = {
  blue: '#2563eb',
  green: '#059669',
  purple: '#7c3aed',
  amber: '#d97706',
  rose: '#e11d48',
  teal: '#0d9488',
};

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent?: StatAccent;
  /** Optional sparkline series rendered under the value. */
  spark?: number[];
  /** Trend chip, e.g. { dir: 'up', value: '2.4%', note: 'vs last month' } */
  trend?: { dir: 'up' | 'down'; value: string; note?: string };
  /** Plain footnote shown when no trend is provided. */
  footnote?: React.ReactNode;
  href?: string;
  className?: string;
  /** fade-up stagger index (1–6). */
  index?: number;
};

/**
 * Institutional KPI card — label, big value, icon chip, optional sparkline + trend.
 * Mirrors the LuxeResort OS dashboard stat tiles.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  accent = 'blue',
  spark,
  trend,
  footnote,
  href,
  className,
  index,
}) => {
  const hex = ACCENT_HEX[accent];

  const body = (
    <div
      className={cn(
        'card-base card-lift group relative h-full overflow-hidden p-5',
        index ? `fade-up fade-up-${index}` : 'fade-up',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${hex}14`, color: hex }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight text-foreground value-pop">{value}</p>

      {spark && spark.length > 1 && (
        <div className="mt-3 -mb-1">
          <Sparkline data={spark} color={hex} width={260} height={42} className="w-full" />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs">
        {trend ? (
          <>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold',
                trend.dir === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              )}
            >
              {trend.dir === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.value}
            </span>
            {trend.note && <span className="text-muted-foreground">{trend.note}</span>}
          </>
        ) : (
          footnote && <span className="text-muted-foreground">{footnote}</span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
};

export default StatCard;
