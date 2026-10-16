import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PRESETS, isYmd, matchPreset } from './period';

type Props = { from: string; to: string; onChange: (from: string, to: string) => void };

/** A complete, plausible date — native date inputs emit "0002-10-16" while the year is being typed. */
const isCommittable = (v: string) => isYmd(v) && v >= '2000-01-01' && v <= '2100-12-31';

/**
 * Preset buttons + From/To date inputs. Compact enough for PageHeader actions; wraps on mobile.
 * The inputs keep a local draft so typing a date never resets the period; a value is committed
 * only once it is a real date, and from <= to is kept by dragging the other bound along.
 */
const PeriodPicker: React.FC<Props> = ({ from, to, onChange }) => {
  const active = matchPreset(from, to);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  useEffect(() => { setDraftFrom(from); }, [from]);
  useEffect(() => { setDraftTo(to); }, [to]);

  const commitFrom = (v: string) => { if (isCommittable(v)) onChange(v, v > to ? v : to); };
  const commitTo = (v: string) => { if (isCommittable(v)) onChange(v < from ? v : from, v); };

  return (
    <div className="flex w-full flex-wrap items-end gap-x-3 gap-y-2 sm:w-auto sm:justify-end">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            type="button"
            size="sm"
            variant={active === p.key ? 'default' : 'outline'}
            onClick={() => { const r = p.range(); onChange(r.from, r.to); }}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="fr-period-from" className="text-xs text-muted-foreground">From</Label>
          <Input
            id="fr-period-from"
            type="date"
            value={draftFrom}
            min="2000-01-01"
            max="2100-12-31"
            onChange={(e) => { setDraftFrom(e.target.value); commitFrom(e.target.value); }}
            onBlur={() => { if (!isCommittable(draftFrom)) setDraftFrom(from); }}
            className="h-8 w-[9.5rem] text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fr-period-to" className="text-xs text-muted-foreground">To</Label>
          <Input
            id="fr-period-to"
            type="date"
            value={draftTo}
            min="2000-01-01"
            max="2100-12-31"
            onChange={(e) => { setDraftTo(e.target.value); commitTo(e.target.value); }}
            onBlur={() => { if (!isCommittable(draftTo)) setDraftTo(to); }}
            className="h-8 w-[9.5rem] text-xs"
          />
        </div>
      </div>
    </div>
  );
};

export default PeriodPicker;
