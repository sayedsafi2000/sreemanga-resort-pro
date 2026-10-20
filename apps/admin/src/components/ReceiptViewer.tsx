import React, { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, ExternalLink, ImageOff, Loader2 } from 'lucide-react';
import { METHOD_LABEL, fmt, errMsg } from '@/pages/Bookings/shared';

/**
 * Shows what a website guest submitted as proof of payment: method, transaction ID and the
 * uploaded receipt screenshot. Pass the image directly (invoice page already has the detail)
 * or a `fetchUrl` — the detail endpoint is loaded on open and `paymentProofImage`,
 * `paymentTransactionId`, `preferredPaymentMethod` are read from `res.data.booking`
 * (room bookings and day-long bookings both answer with that shape).
 */
export type ReceiptViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Loads the booking detail on open when no `image` is given. */
  fetchUrl?: string;
  image?: string | null;
  method?: string | null;
  transactionId?: string | null;
  /** Amount the submission is expected to cover (payment amount). Falls back to `advanceAmount`. */
  amount?: number | null;
  guestName?: string | null;
  invoiceLabel?: string | null;
  advanceAmount?: number | null;
};

type Loaded = {
  image: string | null;
  method: string | null;
  transactionId: string | null;
  guestName: string | null;
  invoiceLabel: string | null;
  advanceAmount: number | null;
};

const mimeOf = (src: string) => /^data:([^;,]+)/.exec(src)?.[1] ?? '';
const extOf = (src: string) => {
  const mime = mimeOf(src);
  if (mime === 'image/jpeg') return 'jpg';
  if (mime.startsWith('image/')) return mime.slice(6).replace(/[^a-z0-9]/gi, '') || 'jpg';
  const m = /\.(png|jpe?g|webp|gif)(?:[?#]|$)/i.exec(src);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
};

/** data:image/...;base64,xxx → Blob so a new tab / download gets a real URL (browsers block top-level data: navigation). */
function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:([^;,]*)((?:;[^;,]*)*),([\s\S]*)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  const isBase64 = /;base64/i.test(m[2]);
  try {
    const raw = isBase64 ? atob(m[3]) : decodeURIComponent(m[3]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

const ReceiptViewer: React.FC<ReceiptViewerProps> = ({
  open, onOpenChange, title, fetchUrl, image, method, transactionId, amount, guestName, invoiceLabel, advanceAmount,
}) => {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Object URLs handed to new tabs / downloads; released when the viewer unmounts.
  const blobUrls = useRef<string[]>([]);
  useEffect(() => () => { blobUrls.current.forEach((u) => URL.revokeObjectURL(u)); blobUrls.current = []; }, []);

  useEffect(() => {
    if (!open || image || !fetchUrl) return;
    let cancelled = false;
    setLoaded(null); setError(null); setLoading(true);
    api.get(fetchUrl)
      .then((res) => {
        if (cancelled) return;
        const bk = res.data?.booking ?? res.data ?? {};
        setLoaded({
          image: bk.paymentProofImage ?? null,
          method: bk.preferredPaymentMethod ?? null,
          transactionId: bk.paymentTransactionId ?? null,
          guestName: bk.guest?.name ?? bk.guestName ?? null,
          invoiceLabel: bk.invoiceLabel ?? null,
          advanceAmount: typeof bk.advanceAmount === 'number' ? bk.advanceAmount : null,
        });
      })
      .catch((e) => { if (!cancelled) setError(errMsg(e, 'Could not load the receipt')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, fetchUrl, image]);

  const img = image ?? loaded?.image ?? null;
  const meth = method ?? loaded?.method ?? null;
  const trx = (transactionId ?? loaded?.transactionId ?? '').trim() || null;
  const guest = guestName ?? loaded?.guestName ?? null;
  const inv = invoiceLabel ?? loaded?.invoiceLabel ?? null;
  const expected = amount ?? advanceAmount ?? loaded?.advanceAmount ?? null;

  const urlFor = (src: string) => {
    if (!src.startsWith('data:')) return src;
    const blob = dataUrlToBlob(src);
    if (!blob) return src;
    const url = URL.createObjectURL(blob);
    blobUrls.current.push(url);
    return url;
  };
  const openFull = () => { if (img) window.open(urlFor(img), '_blank', 'noopener'); };
  const download = () => {
    if (!img) return;
    const a = document.createElement('a');
    a.href = urlFor(img);
    a.download = `receipt-${(inv || 'payment').replace(/[^\w-]+/g, '_')}.${extOf(img)}`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title ?? 'Payment receipt'}</DialogTitle>
          <DialogDescription>What the guest submitted as proof of payment.</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-slate-50 p-3 text-sm sm:grid-cols-5">
          {guest && <div className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Guest</dt><dd className="truncate font-medium">{guest}</dd></div>}
          {inv && <div className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Invoice</dt><dd className="font-mono font-medium">{inv}</dd></div>}
          <div className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Method</dt><dd className="font-medium">{meth ? METHOD_LABEL[meth] ?? meth : '—'}</dd></div>
          <div className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Transaction ID</dt><dd className={trx ? 'break-all font-mono font-medium' : 'italic text-muted-foreground'}>{trx ?? 'not provided'}</dd></div>
          {expected != null && <div className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Amount expected</dt><dd className="font-semibold tabular-nums">{fmt(expected)}</dd></div>}
        </dl>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading receipt…</div>
        ) : error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
        ) : img ? (
          <>
            <img src={img} alt="Payment receipt" className="mx-auto max-h-[70vh] w-auto rounded border object-contain" />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={openFull}><ExternalLink className="mr-1 h-4 w-4" /> Open full size</Button>
              <Button variant="outline" onClick={download}><Download className="mr-1 h-4 w-4" /> Download</Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
            <ImageOff className="h-6 w-6 opacity-60" />
            {trx ? 'No receipt image was attached — the guest only gave a transaction ID.' : 'No receipt image was attached and no transaction ID was given.'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptViewer;
