'use client';

import { useEffect, useState } from 'react';
import {
  shareholderLogin,
  getShareholderSummary,
  getShareholderShares,
  type ShareholderSummary,
  type ShareholderShare,
} from '@/lib/resort-api';

const TOKEN_KEY = 'sh_portal_token';
const fmt = (n: number) => `৳${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function ShareholderPortal() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [summary, setSummary] = useState<ShareholderSummary | null>(null);
  const [shares, setShares] = useState<ShareholderShare[]>([]);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    setToken(t);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const [s, sh] = await Promise.all([getShareholderSummary(token), getShareholderShares(token)]);
      if (cancelled) return;
      if (!s) {
        // token invalid/expired
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        return;
      }
      setSummary(s);
      setShares(sh);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const doLogin = async () => {
    setBusy(true); setError(null);
    const r = await shareholderLogin(email, password);
    setBusy(false);
    if (!r.ok || !r.token) { setError(r.message); return; }
    localStorage.setItem(TOKEN_KEY, r.token);
    setToken(r.token);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setSummary(null);
    setShares([]);
  };

  if (!ready) return null;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-bold text-gray-900">Shareholder Portal</h1>
          <p className="mb-6 text-sm text-gray-500">Sign in to view your investment and returns.</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={password}
                onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doLogin()} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={busy || !email || !password} onClick={doLogin}
              className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-green-800 py-6 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4">
          <div>
            <h1 className="text-xl font-bold">Shareholder Portal</h1>
            {summary && <p className="text-sm text-green-100">Welcome, {summary.name}</p>}
          </div>
          <button onClick={logout} className="rounded-lg border border-green-500 px-3 py-1.5 text-sm">Sign out</button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total Investment" value={fmt(summary.investmentAmount)} />
            <Stat label="Total Received" value={fmt(summary.totalReceived)} accent="text-green-700" />
            <Stat label="Pending" value={fmt(summary.pending)} accent="text-amber-700" />
            <Stat label="Share" value={summary.shareType === 'PERCENTAGE' ? `${summary.shareValue}%` : summary.shareType === 'FIXED' ? `${fmt(summary.shareValue)} fixed` : 'Custom'} />
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Distribution History</h2>
          {shares.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No distributions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">Period</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Paid Date</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-gray-900">{s.distribution.periodLabel}</td>
                      <td className="py-2">{fmt(s.amount)}</td>
                      <td className="py-2">
                        <span className={`rounded px-2 py-0.5 text-xs ${s.status === 'PAID' ? 'bg-green-100 text-green-800' : s.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">{s.paidDate ? new Date(s.paidDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
