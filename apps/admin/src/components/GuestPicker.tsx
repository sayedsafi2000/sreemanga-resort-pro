import React, { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, UserRound, X } from 'lucide-react';

export type GuestPick = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  shareholder?: {
    id: string;
    name: string;
    email?: string | null;
    shareType?: string;
    shareValue?: number;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

type Props = {
  value: GuestPick | null;
  onChange: (guest: GuestPick | null) => void;
  label?: string;
  disabled?: boolean;
};

function shareLabel(g: GuestPick): string | null {
  const sh = g.shareholder;
  if (!sh) return null;
  if (sh.shareType === 'PERCENTAGE') return `Share ${sh.shareValue ?? 0}%`;
  if (sh.shareType === 'FIXED') return `Share ৳${sh.shareValue ?? 0}`;
  return 'Shareholder';
}

function secondaryLine(g: GuestPick): string {
  const parts: string[] = [];
  if (g.email) parts.push(g.email);
  else if (g.shareholder?.email) parts.push(g.shareholder.email);
  else if (g.user?.email) parts.push(g.user.email);
  if (g.phone) parts.push(g.phone);
  const share = shareLabel(g);
  if (share) parts.push(share);
  if (g.user?.role) parts.push(g.user.role);
  return parts.join(' · ') || 'No email on file';
}

/**
 * Typeahead guest search against GET /guests?q=
 * Results include email and linked shareholder/staff when emails match.
 */
const GuestPicker: React.FC<Props> = ({
  value,
  onChange,
  label = 'Search guest',
  disabled,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GuestPick[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/guests?q=${encodeURIComponent(q)}&limit=20`);
        setResults(unwrapList<GuestPick>(res, ['guests']));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (value) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-medium">{value.name}</span>
              {value.shareholder && (
                <Badge variant="outline" className="text-[10px]">
                  {shareLabel(value) || 'Shareholder'}
                </Badge>
              )}
              {value.user && (
                <Badge variant="outline" className="text-[10px]">
                  {value.user.role}
                </Badge>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">{secondaryLine(value)}</div>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => onChange(null)}
              title="Clear guest"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" ref={wrapRef}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search by name, phone, or email…"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {open && query.trim().length > 0 && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-white shadow-md">
            {results.length === 0 && !loading ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No guests found</p>
            ) : (
              results.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/60"
                  onClick={() => {
                    onChange(g);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <span className="flex flex-wrap items-center gap-1.5 font-medium">
                    {g.name}
                    {g.shareholder && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {shareLabel(g) || 'Shareholder'}
                      </Badge>
                    )}
                    {g.user && !g.shareholder && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {g.user.role}
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">{secondaryLine(g)}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestPicker;
