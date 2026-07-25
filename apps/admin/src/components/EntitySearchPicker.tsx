import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

export type EntitySearchItem = {
  id: string;
  title: string;
  subtitle?: string;
};

type Props = {
  label: string;
  placeholder?: string;
  emptyText?: string;
  items: EntitySearchItem[];
  onPick: (item: EntitySearchItem) => void;
};

/**
 * Single typeahead search+pick (same UX as GuestPicker), for local lists.
 */
const EntitySearchPicker: React.FC<Props> = ({
  label,
  placeholder = 'Search by name or email…',
  emptyText = 'No matches',
  items,
  onPick,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          (it.subtitle || '').toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [items, query]);

  return (
    <div className="space-y-2" ref={wrapRef}>
      <Label>{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
        />
        {open && query.trim().length > 0 && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-white shadow-md">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              filtered.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/60"
                  onClick={() => {
                    onPick(it);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{it.title}</span>
                  {it.subtitle && (
                    <span className="text-xs text-muted-foreground">{it.subtitle}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EntitySearchPicker;
