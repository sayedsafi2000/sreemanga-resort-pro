import React, { forwardRef, Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, Info, MapPin, Pencil, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtDate } from '@/pages/Bookings/shared';
import type { Statement } from './types';
import { buildSections, memoItems, money, type SheetItem, type SheetRow } from './rows';
import { fmtYmd } from './period';

type Props = {
  data: Statement;
  /** Every breakdown open and chevrons disabled — the PDF/print is WYSIWYG. */
  detailed: boolean;
  resortName: string;
  logo?: string;
  settings: Record<string, string>;
  /** Called with `row.action.key` when a row's screen-only action button is clicked. */
  onAction?: (key: string) => void;
};

const ROW_CLASS: Record<SheetRow['variant'], string> = {
  line: 'border-t border-slate-100',
  total: 'border-t border-slate-300 font-bold',
  grand: 'border-t-2 border-slate-800 font-bold',
  info: 'border-t border-dashed border-slate-200 italic text-muted-foreground',
};

const ItemRow: React.FC<{ item: SheetItem }> = ({ item }) => (
  <tr className="break-inside-avoid">
    <td className={`py-1 pl-12 pr-3 text-xs ${item.strong ? 'font-semibold text-slate-800' : item.muted ? 'text-slate-500' : 'text-slate-600'}`}>
      {item.sign && <span className="mr-1.5 inline-block w-3 text-center font-mono text-slate-400">{item.sign}</span>}
      {item.href ? (
        // Screen-only underline; the <a> prints as plain text (no print:hidden here — html2pdf would drop the label).
        <Link to={item.href} className="underline decoration-dotted underline-offset-2 hover:text-primary print:no-underline">{item.label}</Link>
      ) : (
        item.label
      )}
      {item.hint && <span className="ml-2 text-[11px] text-slate-400">{item.hint}</span>}
      {item.note && <div className="mt-0.5 text-[11px] italic text-slate-400">{item.note}</div>}
    </td>
    <td className={`whitespace-nowrap py-1 pr-2 text-right text-xs tabular-nums ${item.strong ? 'font-semibold text-slate-800' : item.muted ? 'text-slate-500' : 'text-slate-600'}`}>
      {money(item.amount)}
    </td>
    <td className="w-px print:hidden" />
  </tr>
);

/** White A4-style statement: letterhead, three numbered sections, warnings, memo. Printable (no fixed heights / overflow). */
const StatementSheet = forwardRef<HTMLDivElement, Props>(({ data, detailed, resortName, logo, settings, onAction }, ref) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const sections = useMemo(() => buildSections(data), [data]);
  const isOpen = (key: string) => detailed || !!open[key];
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const address = settings.resortAddress || settings.address;
  const phone = settings.resortPhone || settings.phone;
  const cashTotal = data.balanceSheet.currentAssets.cash.total;
  const { from, to, label } = data.period;

  return (
    <div ref={ref} className="rounded-2xl border bg-white p-6 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-8">
      {/* Letterhead */}
      <div className="flex flex-col gap-6 border-b pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          {logo && <img src={logo} alt={resortName} className="h-16 w-16 rounded-xl bg-black object-contain p-1" />}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-primary">{resortName}</h2>
            {settings.tagline && <p className="text-xs uppercase tracking-widest text-muted-foreground">{settings.tagline}</p>}
            {address && <p className="flex items-start gap-1.5 text-sm text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{address}</p>}
            {phone && <p className="flex items-center gap-1.5 text-sm text-slate-600"><Phone className="h-3.5 w-3.5" />{phone}</p>}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 text-sm md:min-w-[260px] md:text-right">
          <p className="text-lg font-bold tracking-wide text-primary">FINANCIAL REPORT</p>
          <p><span className="text-muted-foreground">Period:</span> <span className="font-semibold">{label}</span></p>
          <p className="text-slate-600">From {fmtYmd(from)} to {fmtYmd(to)}</p>
          <p className="text-slate-600">Balance sheet as of {fmtYmd(to)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Generated {fmtDate(new Date())}</p>
        </div>
      </div>

      {/* Sections */}
      {sections.map((sec) => (
        <section key={sec.no} className="mt-6">
          <h3 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">{sec.no}</span>
            {sec.title}
            {sec.caption && <span className="text-xs font-normal text-muted-foreground">{sec.caption}</span>}
          </h3>
          <table className="mt-2 w-full border-collapse text-sm">
            <tbody>
              {sec.rows.map((row) => {
                const expandable = !!row.groups?.length;
                const expanded = expandable && isOpen(row.key);
                const rose = row.roseWhenNegative && row.amount < 0;
                return (
                  <Fragment key={row.key}>
                    <tr className={`break-inside-avoid ${ROW_CLASS[row.variant]}`}>
                      <td className="py-2 pr-3 align-top">
                        <div className="flex items-start gap-1.5">
                          {expandable ? (
                            <button
                              type="button"
                              onClick={() => toggle(row.key)}
                              disabled={detailed}
                              aria-expanded={expanded}
                              aria-label={`${expanded ? 'Hide' : 'Show'} breakdown of ${row.label}`}
                              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent print:hidden"
                            >
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : (
                            <span className="mt-0.5 inline-block h-5 w-5 shrink-0 print:hidden" />
                          )}
                          <div>
                            <div>{row.label}</div>
                            {row.hint && <div className="text-[11px] font-normal not-italic text-muted-foreground">{row.hint}</div>}
                          </div>
                        </div>
                      </td>
                      <td className={`w-40 whitespace-nowrap py-2 pr-2 text-right align-top tabular-nums ${rose ? 'text-rose-700' : ''}`}>{money(row.amount)}</td>
                      {/* Screen-only action column (w-px keeps it as narrow as its content). */}
                      <td className="w-px whitespace-nowrap py-1 pl-1 align-top print:hidden">
                        {row.action && onAction && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-normal not-italic text-slate-600 print:hidden"
                            onClick={() => onAction(row.action!.key)}
                          >
                            <Pencil className="mr-1 h-3 w-3" /> {row.action.label}
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expanded &&
                      row.groups!.map((g, gi) => (
                        <Fragment key={gi}>
                          {g.title && (
                            <tr>
                              <td colSpan={3} className="pb-0.5 pl-12 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</td>
                            </tr>
                          )}
                          {g.items.length === 0 ? (
                            <tr><td colSpan={3} className="py-1 pl-12 text-xs italic text-slate-400">{g.empty ?? 'Nothing recorded'}</td></tr>
                          ) : (
                            g.items.map((it, ii) => <ItemRow key={ii} item={it} />)
                          )}
                        </Fragment>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {sec.note && <p className="mt-1.5 flex items-start gap-1 text-[11px] italic text-muted-foreground"><Info className="mt-0.5 h-3 w-3 shrink-0" />{sec.note}</p>}
        </section>
      ))}

      {/* Integrity hints */}
      {!data.balanceSheet.balanced && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Total Asset does not equal Liabilities + Owner's Equity ({money(data.balanceSheet.totalAssets)} vs {money(data.balanceSheet.totalLiabilitiesEquity)}). This should never happen — please report it.
        </div>
      )}
      {cashTotal < 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Cash is negative — enter opening balances under Other entries.
        </div>
      )}

      {/* Memo */}
      <section className="mt-6 rounded-xl border border-dashed border-slate-300 p-4">
        <h3 className="text-sm font-semibold">Memo — not included above (as of today)</h3>
        <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {memoItems(data.memo).map((m) => (
            <div key={m.label} className="flex items-baseline justify-between gap-3 border-b border-dotted border-slate-200 pb-1">
              <dt className="text-slate-600">{m.label}</dt>
              <dd className="whitespace-nowrap font-medium tabular-nums">{money(m.amount)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[11px] text-muted-foreground">Dues are receivable, stock and unpaid bills/salaries are payable or inventory — none of them is cash, so the cash-basis sheet above leaves them out.</p>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Cash basis, derived from recorded payments and expenses. Computer-generated — no signature required.
      </p>
    </div>
  );
});
StatementSheet.displayName = 'StatementSheet';

export default StatementSheet;
