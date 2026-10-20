import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import logoMark from '@/assets/logo-mark.png';
import { downloadCsv } from '@/lib/csv';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessPath, canDeleteFinanceEntries, canEditFinanceEntries } from '@/config/rbac';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Download, FileDown, Info, Landmark, Loader2, PieChart, Printer } from 'lucide-react';
import { errMsg } from '@/pages/Bookings/shared';
import type { Statement } from './types';
import { isYmd, thisMonth } from './period';
import { csvRows, distributionHref } from './rows';
import PeriodPicker from './PeriodPicker';
import StatementSheet from './StatementSheet';
import OtherEntriesDialog from './OtherEntriesDialog';
import IncomeTaxDialog from './IncomeTaxDialog';

type Settings = Record<string, string>;

/** Shimmer placeholder shaped like the sheet, shown only before the first statement arrives. */
const SheetSkeleton: React.FC = () => (
  <div className="rounded-2xl border bg-white p-6 shadow-card sm:p-8">
    <div className="flex items-start justify-between gap-6 border-b pb-6">
      <div className="flex items-start gap-4">
        <div className="shimmer h-16 w-16 rounded-xl" />
        <div className="space-y-2"><div className="shimmer h-6 w-40 rounded-md" /><div className="shimmer h-3 w-56 rounded-full" /><div className="shimmer h-3 w-32 rounded-full" /></div>
      </div>
      <div className="shimmer h-24 w-60 rounded-xl" />
    </div>
    {[7, 4, 6].map((rows, s) => (
      <div key={s} className="mt-6 space-y-3">
        <div className="shimmer h-5 w-48 rounded-md" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between gap-4"><div className="shimmer h-3.5 w-1/2 rounded-full" /><div className="shimmer h-3.5 w-24 rounded-full" /></div>
        ))}
      </div>
    ))}
  </div>
);

const FinancialReport: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Period lives in the URL (?from&to) so the page is linkable; invalid or missing → this month.
  const range = useMemo(() => {
    const from = params.get('from');
    const to = params.get('to');
    return isYmd(from) && isYmd(to) && from <= to ? { from, to } : thisMonth();
  }, [params]);

  useEffect(() => {
    if (params.get('from') === range.from && params.get('to') === range.to) return;
    const next = new URLSearchParams(params);
    next.set('from', range.from);
    next.set('to', range.to);
    setParams(next, { replace: true });
  }, [params, range, setParams]);

  const setRange = (from: string, to: string) => {
    const next = new URLSearchParams(params);
    next.set('from', from);
    next.set('to', to);
    setParams(next, { replace: true });
  };

  const [data, setData] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [detailed, setDetailed] = useState(false);
  const [entriesOpen, setEntriesOpen] = useState(false);
  const [taxOpen, setTaxOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [settings, setSettings] = useState<Settings>({});
  const [logo, setLogo] = useState<string>(logoMark);

  // Letterhead data — loaded once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, br] = await Promise.all([
        api.get('/public/settings').catch(() => ({ data: {} })),
        api.get('/branding').catch(() => ({ data: {} })),
      ]);
      if (cancelled) return;
      setSettings((s.data?.settings as Settings) ?? {});
      const brand = (br.data?.settings ?? br.data ?? {}) as Record<string, string>;
      if (brand.site_logo) setLogo(brand.site_logo);
    })();
    return () => { cancelled = true; };
  }, []);

  // Statement — reloaded on every period change and after Other entries change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/finance/statement?from=${range.from}&to=${range.to}`)
      .then((res) => { if (!cancelled) setData(res.data as Statement); })
      .catch((e) => { if (!cancelled) setError(errMsg(e, 'Could not load the financial report')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range.from, range.to, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const resortName = settings.resortName || 'Pina Vista';
  const distributable = data?.distribution.distributable ?? 0;
  const canDistribute = canAccessPath(user?.role, '/shareholders') && distributable > 0 && !loading;
  const planned = data?.distribution.planned ?? [];
  const canSeeShareholders = canAccessPath(user?.role, '/shareholders');

  // Row action buttons on the sheet (rows.ts `action.key`).
  const onSheetAction = (key: string) => {
    if (key === 'edit-income-tax') setTaxOpen(true);
  };
  // Name files after the statement actually on screen (not the URL, which may already point at the next period).
  const fileBase = `financial-report-${data?.period.from ?? range.from}-${data?.period.to ?? range.to}`;
  const exportsDisabled = !data || loading;

  const createDistribution = () => {
    if (!data) return;
    const q = new URLSearchParams({
      newDistribution: '1',
      totalProfit: String(distributable),
      periodStart: range.from,
      periodEnd: range.to,
      periodLabel: data.period.label,
    });
    navigate(`/shareholders?${q.toString()}`);
  };

  const exportCsv = () => { if (data) downloadCsv(`${fileBase}.csv`, csvRows(data, detailed)); };

  // Client-side PDF of the sheet (A4, same markup as print). Library is loaded on demand.
  const downloadPdf = async () => {
    if (!sheetRef.current || !data) return;
    setPdfBusy(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `${fileBase}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          // html2canvas renders screen styles, so drop the print:hidden chevrons explicitly to keep the PDF WYSIWYG with print.
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            ignoreElements: (el: Element) => el.classList?.contains('print:hidden') ?? false,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(sheetRef.current)
        .save();
    } catch (e) {
      setError(errMsg(e, 'Could not generate the PDF — use Print → Save as PDF instead'));
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        className="print:hidden"
        eyebrow="Finance"
        title="Financial Report"
        description="Income statement, profit distribution and balance sheet — cash basis, derived from recorded payments and expenses."
        actions={<PeriodPicker from={range.from} to={range.to} onChange={setRange} />}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex gap-1 rounded-lg border bg-white p-0.5">
          <Button type="button" size="sm" variant={detailed ? 'ghost' : 'default'} onClick={() => setDetailed(false)}>Summary</Button>
          <Button type="button" size="sm" variant={detailed ? 'default' : 'ghost'} onClick={() => setDetailed(true)}>Detailed</Button>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setEntriesOpen(true)}>
          <Landmark className="mr-1 h-4 w-4" /> Other entries
        </Button>
        {canDistribute && (
          <Button type="button" size="sm" variant="success" onClick={createDistribution}>
            <PieChart className="mr-1 h-4 w-4" /> Create distribution
          </Button>
        )}
        {planned.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Draft distribution exists for this period —{' '}
            {canSeeShareholders ? (
              <Link to={distributionHref(planned[0].id)} className="underline underline-offset-2 hover:text-primary">edit it on the Shareholders page</Link>
            ) : (
              'edit it on the Shareholders page'
            )}
          </p>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={exportCsv} disabled={exportsDisabled}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={downloadPdf} disabled={exportsDisabled || pdfBusy}>
            {pdfBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />} Download PDF
          </Button>
          <Button type="button" size="sm" variant="ink" onClick={() => window.print()} disabled={exportsDisabled}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive print:hidden">{error}</div>
      )}

      <div className="mx-auto max-w-5xl print:max-w-none">
        {data ? (
          <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            <StatementSheet ref={sheetRef} data={data} detailed={detailed} resortName={resortName} logo={logo} settings={settings} onAction={onSheetAction} />
          </div>
        ) : loading ? (
          <SheetSkeleton />
        ) : null}
      </div>

      <OtherEntriesDialog
        open={entriesOpen}
        onOpenChange={setEntriesOpen}
        canEdit={canEditFinanceEntries(user?.role)}
        canDelete={canDeleteFinanceEntries(user?.role)}
        onChanged={reload}
      />
      <IncomeTaxDialog
        open={taxOpen}
        onOpenChange={setTaxOpen}
        categoryId={data?.incomeTaxCategoryId ?? null}
        from={data?.period.from ?? range.from}
        to={data?.period.to ?? range.to}
        onChanged={reload}
      />
    </div>
  );
};

export default FinancialReport;
