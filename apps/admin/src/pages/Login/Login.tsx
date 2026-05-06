import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hotel, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_38%),radial-gradient(circle_at_80%_15%,rgba(20,184,166,0.14),transparent_36%),radial-gradient(circle_at_50%_80%,rgba(5,150,105,0.18),transparent_42%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md rounded-2xl border-emerald-200/60 bg-white/85 text-card-foreground shadow-[0_20px_80px_rgba(6,95,70,0.2)] backdrop-blur-md">
          <CardHeader className="space-y-4 pb-4 text-center">
            <div className="mx-auto inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium tracking-wide text-emerald-700">
              Welcome back
            </div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600/10 ring-1 ring-emerald-500/20">
              <Hotel className="h-9 w-9 text-emerald-700" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-bold tracking-tight text-emerald-900">Resort Admin</CardTitle>
              <CardDescription className="text-sm text-emerald-700/80">
                Sign in to manage your resort operations
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-emerald-900">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@resort.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-transparent bg-white/95 shadow-sm placeholder:text-emerald-900/40 focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-emerald-900">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl border-transparent bg-white/95 shadow-sm placeholder:text-emerald-900/40 focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-emerald-800/80">Remember me</span>
              </label>
              <a href="#" className="text-sm text-emerald-700 hover:text-emerald-900 hover:underline">Forgot password?</a>
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold text-white shadow-md transition hover:from-emerald-700 hover:to-teal-700"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            <p className="mt-1 border-t border-emerald-100 pt-3 text-center text-sm text-emerald-800/80">
              Need help? <a href="#" className="font-medium text-emerald-700 hover:text-emerald-900 hover:underline">Contact support</a>
            </p>
          </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
