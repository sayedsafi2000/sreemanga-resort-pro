import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/api';
import { landingPath } from '@/config/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mountain, Loader2, UserPlus, PieChart } from 'lucide-react';

const REMEMBER_KEY = 'resort_admin_remember_email';

const Login: React.FC = () => {
  const [audience, setAudience] = useState<'staff' | 'shareholder'>('staff');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)));
  const [supportEmail, setSupportEmail] = useState<string>('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const isShareholder = audience === 'shareholder';

  useEffect(() => {
    if (user) navigate(landingPath(user.role));
  }, [user, navigate]);

  useEffect(() => {
    fetch(`${getApiBaseUrl()}/public/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.settings?.resortEmail || d?.settings?.contact_email;
        if (typeof v === 'string') setSupportEmail(v);
      })
      .catch(() => {});
  }, []);

  const switchAudience = (a: 'staff' | 'shareholder') => {
    setAudience(a);
    setMode('login');
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (remember) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
      // Redirect handled by the useEffect watching `user` (role-aware).
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // Public self-registration always creates a Receptionist account.
      // Elevated roles are assigned by a Super Admin from User Accounts.
      const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setSuccess('Account created! You can now log in.');
      setMode('login');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const supportMailto = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent('Resort — password reset request')}&body=${encodeURIComponent('Please reset the password for the following account:\n\nEmail: \nReason: \n')}`
    : undefined;

  // Theme differs by audience so shareholders get a visibly distinct screen.
  const bg = isShareholder
    ? 'bg-gradient-to-br from-fuchsia-950 via-purple-900 to-slate-900'
    : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';
  const glow = isShareholder
    ? 'bg-[radial-gradient(circle_at_20%_20%,rgba(217,70,239,0.22),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(147,51,234,0.18),transparent_38%)]'
    : 'bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.22),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(79,70,229,0.16),transparent_38%)]';
  const iconWrap = isShareholder ? 'bg-fuchsia-600 shadow-fuchsia-600/30' : 'bg-primary shadow-primary/30';
  const chip = isShareholder ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' : 'border-blue-200 bg-blue-50 text-blue-700';

  return (
    <div className={`relative min-h-screen overflow-hidden ${bg}`}>
      <div className={`pointer-events-none absolute inset-0 ${glow}`} />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md rounded-2xl border-white/10 bg-white/95 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.5)] backdrop-blur-md">
          {/* Audience switch */}
          <div className="flex gap-1 rounded-t-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchAudience('staff')}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${!isShareholder ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Staff
            </button>
            <button
              type="button"
              onClick={() => switchAudience('shareholder')}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${isShareholder ? 'bg-white text-fuchsia-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Shareholder
            </button>
          </div>

          <CardHeader className="space-y-4 pb-4 text-center">
            <div className={`mx-auto inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${chip}`}>
              {isShareholder ? 'Shareholder Portal' : mode === 'login' ? 'Welcome back' : 'Create account'}
            </div>
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${iconWrap}`}>
              {isShareholder ? <PieChart className="h-9 w-9 text-white" />
                : mode === 'login' ? <Mountain className="h-9 w-9 text-white" />
                : <UserPlus className="h-9 w-9 text-white" />}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
                {isShareholder ? 'Shareholder Login' : mode === 'login' ? 'Resort Admin' : 'Register'}
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                {isShareholder
                  ? 'Sign in to view your investment and returns'
                  : mode === 'login' ? 'Sign in to manage your resort operations' : 'Create a new staff account'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {mode === 'login' || isShareholder ? (
              <form onSubmit={handleLogin} className="space-y-5">
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</Label>
                  <Input id="email" type="email" placeholder={isShareholder ? 'you@example.com' : 'admin@resortnirjon.com'} value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 rounded-xl" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <span className="text-slate-600">Remember me</span>
                  </label>
                  {supportMailto ? (
                    <a href={supportMailto} className="text-sm text-primary hover:underline">Forgot password?</a>
                  ) : (
                    <span className="text-sm text-slate-400">Forgot password?</span>
                  )}
                </div>
                <Button type="submit" className={`h-11 w-full rounded-xl text-base font-semibold ${isShareholder ? 'bg-fuchsia-600 hover:bg-fuchsia-700' : ''}`} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                {!isShareholder && (
                  <p className="text-center text-sm text-slate-500">
                    Don&apos;t have an account?{' '}
                    <button type="button" onClick={() => { setMode('register'); setError(''); setSuccess(''); }} className="font-medium text-primary hover:underline">
                      Register here
                    </button>
                  </p>
                )}
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</Label>
                  <Input id="name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regEmail" className="text-sm font-medium text-slate-700">Email address</Label>
                  <Input id="regEmail" type="email" placeholder="staff@resortnirjon.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regPassword" className="text-sm font-medium text-slate-700">Password</Label>
                  <Input id="regPassword" type="password" placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11 rounded-xl" />
                </div>
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  New accounts are created as <span className="font-medium">Receptionist</span>. A Super Admin can change roles afterwards.
                </p>
                <Button type="submit" className="h-11 w-full rounded-xl text-base font-semibold" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register
                </Button>
                <p className="text-center text-sm text-slate-500">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('login'); setError(''); }} className="font-medium text-primary hover:underline">
                    Login here
                  </button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
