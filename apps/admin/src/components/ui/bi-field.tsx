import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type Props = {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  bn: string;
  onChangeBn: (v: string) => void;
  textarea?: boolean;
  rows?: number;
  placeholder?: string;
  placeholderBn?: string;
  required?: boolean;
  hint?: React.ReactNode;
  className?: string;
};

const Badge = ({ children, tone }: { children: React.ReactNode; tone: 'en' | 'bn' }) => (
  <span className={`pointer-events-none absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none ${tone === 'en' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>{children}</span>
);

/**
 * One label, two inputs: English and বাংলা. Content entered here appears on the public site in
 * whichever language the visitor has selected; an empty Bangla box falls back to the English text.
 */
export function BiField({ label, value, onChange, bn, onChangeBn, textarea, rows = 3, placeholder, placeholderBn, required, hint, className = '' }: Props) {
  const Field = textarea ? Textarea : Input;
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>{label}{required ? ' *' : ''}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Field value={value} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)} placeholder={placeholder ?? 'In English'} className="pr-12" {...(textarea ? { rows } : {})} />
          <Badge tone="en">EN</Badge>
        </div>
        <div className="relative">
          <Field value={bn} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChangeBn(e.target.value)} placeholder={placeholderBn ?? 'বাংলায় লিখুন'} lang="bn" className="pr-12" {...(textarea ? { rows } : {})} />
          <Badge tone="bn">বাং</Badge>
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
