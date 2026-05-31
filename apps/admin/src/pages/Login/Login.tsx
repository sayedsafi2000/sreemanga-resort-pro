import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mountain, Loader2, UserPlus } from 'lucide-react';

const REMEMBER_KEY = 'resort_admin_remember_email';

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'HOUSEKEEPING', label: 'Housekeeping' },
  { value: 'RESTAURANT_STAFF', label: 'Restaurant Staff' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
];

const Login: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('RECEPTIONIST');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)));
  const [supportEmail, setSupportEmail] = useState<string>('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetch(`${getApiBaseUrl()}/public/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.settings?.resortEmail || d?.settings?.contact_email;
        if (typeof v === 'string') setSupportEmail(v);
      })
      .catch(() => { /* non-blocking */ });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      setMode('login');
      setError('');
      alert('Registration successful! Please login.');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const supportMailto = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent('Resort Admin — password reset request')}&body=${encodeURIComponent('Please reset the password for the following admin account:\n\nEmail: \nReason: \n')}`
    : undefined;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.22),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(79,70,229,0.16),transparent_38%),radial-gradient(circle_at_50%_85%,rgba(37,99,235,0.18),transparent_44%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md rounded-2xl border-white/10 bg-white/95 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.5)] backdrop-blur-md">
          <CardHeader className="space-y-4 pb-4 text-center">
            <div className="mx-auto inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium tracking-wide text-blue-700">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              {mode === 'login' ? <Mountain className="h-9 w-9 text-white" /> : <UserPlus className="h-9 w-9 text-white" />}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
                {mode === 'login' ? 'Resort Admin' : 'Register'}
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                {mode === 'login' ? 'Sign in to manage your resort operations' : 'Create a new admin account'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@resortnirjon.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-slate-600">Remember me</span>
                  </label>
                  {supportMailto ? (
                    <a href={supportMailto} className="text-sm text-primary hover:text-blue-700 hover:underline">
                      Forgot password?
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400 cursor-not-allowed" title="Support email not configured yet">
                      Forgot password?
                    </span>
                  )}
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl text-base font-semibold"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                <p className="text-center text-sm text-slate-500">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => { setMode('register'); setError(''); }} className="font-medium text-primary hover:text-blue-700 hover:underline">
                    Register here
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regEmail" className="text-sm font-medium text-slate-700">Email address</Label>
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="admin@resortnirjon.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regPassword" className="text-sm font-medium text-slate-700">Password</Label>
                  <Input
                    id="regPassword"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-slate-700">Role</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="h-11 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-inner-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl text-base font-semibold"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register
                </Button>
                <p className="text-center text-sm text-slate-500">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('login'); setError(''); }} className="font-medium text-primary hover:text-blue-700 hover:underline">
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