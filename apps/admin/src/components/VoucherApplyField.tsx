import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Ticket } from 'lucide-react';

export type VoucherChannel = 'ROOM' | 'DAY_LONG' | 'RESTAURANT';

export type VoucherLineItem = {
  itemType: 'ROOM' | 'DAY_LONG_PRODUCT' | 'MENU_ITEM';
  itemId: string;
  amount: number;
};

export type LookupVoucher = {
  id: string;
  name: string;
  discountType: string;
  discountValue: number;
  appliesRoom: boolean;
  appliesDayLong: boolean;
  appliesRestaurant: boolean;
  codeHint: string;
  code?: string;
  expired?: boolean;
  exhausted?: boolean;
  remaining?: number | null;
};

type Preview = { discountAmount: number; netAmount: number } | null;

type Props = {
  channel: VoucherChannel;
  grossAmount: number;
  lineItems?: VoucherLineItem[];
  guestEmail?: string | null;
  guestId?: string | null;
  value: string;
  onChange: (code: string) => void;
  preview: Preview;
  onPreview: (p: Preview) => void;
  onError?: (message: string | null) => void;
  disabled?: boolean;
};

function appliesToChannel(v: LookupVoucher, channel: VoucherChannel): boolean {
  if (channel === 'ROOM') return v.appliesRoom;
  if (channel === 'DAY_LONG') return v.appliesDayLong;
  return v.appliesRestaurant;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function realGuestId(id?: string | null): string | undefined {
  if (!id || !UUID_RE.test(id)) return undefined;
  return id;
}

const VoucherApplyField: React.FC<Props> = ({
  channel,
  grossAmount,
  lineItems,
  guestEmail,
  guestId,
  value,
  onChange,
  preview,
  onPreview,
  onError,
  disabled,
}) => {
  const [checking, setChecking] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [matches, setMatches] = useState<LookupVoucher[]>([]);

  const email = (guestEmail || '').trim();

  useEffect(() => {
    if (!email || !email.includes('@')) {
      setMatches([]);
      return;
    }
    const t = setTimeout(async () => {
      setLookingUp(true);
      try {
        const res = await api.get(`/vouchers/lookup?email=${encodeURIComponent(email)}`);
        const list = unwrapList<LookupVoucher>(res, ['vouchers']).filter(
          (v) =>
            !v.expired &&
            !v.exhausted &&
            (v.remaining == null || v.remaining > 0) &&
            appliesToChannel(v, channel)
        );
        setMatches(list);
      } catch {
        setMatches([]);
      } finally {
        setLookingUp(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [email, channel]);

  const validate = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || grossAmount <= 0) return;
    setChecking(true);
    onError?.(null);
    try {
      const res = await api.post('/vouchers/validate', {
        code: trimmed,
        channel,
        grossAmount,
        lineItems: lineItems?.length ? lineItems : undefined,
        guestId: realGuestId(guestId),
        guestEmail: email || undefined,
      });
      onPreview({
        discountAmount: Number(res.data.discountAmount),
        netAmount: Number(res.data.netAmount),
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; error?: string } } };
      onPreview(null);
      const msg =
        ax.response?.data?.message ||
        ax.response?.data?.error ||
        'Invalid voucher';
      onError?.(msg);
      // Clear selected code when the voucher is exhausted / inactive so staff don't retry it
      if (/redemption limit|no longer available|inactive/i.test(msg)) {
        onChange('');
        setMatches((prev) =>
          prev.filter((m) => m.code?.toUpperCase() !== trimmed.toUpperCase())
        );
      }
    } finally {
      setChecking(false);
    }
  };

  const pick = async (v: LookupVoucher) => {
    if (!v.code) {
      onError?.(`Enter full code ending in ${v.codeHint} (plaintext not stored).`);
      onChange('');
      return;
    }
    onChange(v.code);
    await validate(v.code);
  };

  return (
    <div className="space-y-2">
      <Label>Voucher (optional)</Label>
      {!email ? (
        <p className="text-xs text-muted-foreground">
          Enter guest email to search their vouchers, or type a code below.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Looking up vouchers for <span className="font-medium text-foreground">{email}</span>
          {lookingUp && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
        </p>
      )}

      {matches.length > 0 && (
        <ul className="max-h-36 space-y-1 overflow-auto rounded-md border p-2">
          {matches.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                disabled={disabled || checking}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60 disabled:opacity-50"
                onClick={() => void pick(v)}
              >
                <span className="min-w-0">
                  <span className="font-medium">{v.name}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {v.discountType === 'PERCENT' ? `${v.discountValue}%` : `৳${v.discountValue}`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {v.code ? (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {v.code}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      ••••{v.codeHint}
                    </Badge>
                  )}
                  <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            onPreview(null);
          }}
          placeholder="Or type code e.g. SUMMER10"
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !value.trim() || grossAmount <= 0 || checking}
          onClick={() => void validate(value)}
        >
          {checking ? '…' : 'Apply'}
        </Button>
      </div>
      {preview && (
        <p className="text-sm text-green-700">
          Save ৳{preview.discountAmount.toLocaleString()} — net ৳
          {preview.netAmount.toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default VoucherApplyField;
