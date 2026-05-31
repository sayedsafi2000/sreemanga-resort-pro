import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Menu, X, Mountain, ChevronDown, ChevronUp, Plus, Bell, Settings, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getSidebarItems, navItemHref, sidebarItemActive, canAccessPath, EXPENDITURE_SIDEBAR_KEY } from '@/config/rbac';
import { InitialsAvatar } from '@/components/ui/avatar';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';

type ExpNavCat = { id: string; name: string; sortOrder: number };

// ── Role badge styling ────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; dark: string; light: string }> = {
  SUPER_ADMIN:      { label: 'Super Admin',      dark: 'bg-violet-500/15 text-violet-300',  light: 'bg-violet-50 text-violet-700' },
  MANAGER:          { label: 'Manager',          dark: 'bg-blue-500/15 text-blue-300',      light: 'bg-blue-50 text-blue-700' },
  RECEPTIONIST:     { label: 'Receptionist',     dark: 'bg-emerald-500/15 text-emerald-300', light: 'bg-emerald-50 text-emerald-700' },
  HOUSEKEEPING:     { label: 'Housekeeping',     dark: 'bg-amber-500/15 text-amber-300',    light: 'bg-amber-50 text-amber-700' },
  RESTAURANT_STAFF: { label: 'Restaurant Staff', dark: 'bg-orange-500/15 text-orange-300',  light: 'bg-orange-50 text-orange-700' },
  ACCOUNTANT:       { label: 'Accountant',       dark: 'bg-teal-500/15 text-teal-300',      light: 'bg-teal-50 text-teal-700' },
};

// ── Expenditure nav group ─────────────────────────────────────────────────────

function ExpenditureNavGroup({
  label,
  Icon,
  onNavigate,
}: {
  label: string;
  Icon: LucideIcon;
  onNavigate: () => void;
}) {
  const location = useLocation();
  const [categories, setCategories] = useState<ExpNavCat[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/expenditures/categories')
      .then((res) => {
        if (cancelled) return;
        const list = unwrapList<ExpNavCat>(res, ['categories']);
        setCategories([...(list || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, []);

  const q = new URLSearchParams(location.search);
  const tab = q.get('tab') || 'expenses';
  const categoryId = q.get('categoryId');
  const parentHref = '/expenditures?tab=expenses';
  const parentActive = location.pathname === '/expenditures' && !(tab === 'expenses' && Boolean(categoryId));
  const isAnyActive = location.pathname === '/expenditures';

  return (
    <div>
      <div className="relative flex items-center">
        <Link
          to={parentHref}
          onClick={onNavigate}
          className={`group relative flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
            parentActive
              ? 'bg-primary text-white shadow-sm'
              : isAnyActive
              ? 'bg-sidebar-accent text-slate-200'
              : 'text-sidebar-text hover:bg-sidebar-item-hover hover:text-slate-100'
          }`}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          {label}
        </Link>
        {categories.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mr-1 flex h-6 w-6 items-center justify-center rounded text-sidebar-text transition hover:text-slate-100"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {open && categories.length > 0 && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
          {categories.map((c) => {
            const href = `/expenditures?tab=expenses&categoryId=${encodeURIComponent(c.id)}`;
            const childOn = location.pathname === '/expenditures' && tab === 'expenses' && categoryId === c.id;
            return (
              <Link
                key={c.id}
                to={href}
                onClick={onNavigate}
                className={`block rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                  childOn
                    ? 'bg-primary/15 text-blue-300'
                    : 'text-sidebar-text hover:bg-sidebar-item-hover hover:text-slate-300'
                }`}
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!user) {
    return <>{children}</>;
  }

  const roleMeta = ROLE_META[user.role] ?? { label: user.role, dark: 'bg-white/10 text-white/70', light: 'bg-muted text-muted-foreground' };
  const sidebarItems = getSidebarItems(user.role);
  const canBook = canAccessPath(user.role, '/bookings');

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Mobile overlay ────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={`sidebar-scroll fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto bg-sidebar-bg transition-transform duration-300 ease-out lg:static lg:inset-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* ── Brand / Logo ─────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-sidebar-border px-5 py-[18px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
            <Mountain className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-white">Imperial Peak</p>
            <p className="eyebrow !text-[10px] !tracking-[0.12em] text-slate-500">Institutional Grade</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-sidebar-item-hover hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Nav items ─────────────────────────────────────────────────── */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            if (item.key === EXPENDITURE_SIDEBAR_KEY) {
              return (
                <ExpenditureNavGroup
                  key={item.key}
                  label={item.label}
                  Icon={Icon}
                  onNavigate={() => setSidebarOpen(false)}
                />
              );
            }
            const href = navItemHref(item);
            const isActive = sidebarItemActive(location.pathname, location.search, item);
            return (
              <Link
                key={item.key}
                to={href}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'text-sidebar-text hover:bg-sidebar-item-hover hover:text-slate-100'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 transition-transform duration-150 ${isActive ? '' : 'group-hover:scale-110'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── New Booking CTA ───────────────────────────────────────────── */}
        {canBook && (
          <div className="shrink-0 px-3 pb-1">
            <Link
              to="/bookings?new=1"
              onClick={() => setSidebarOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              New Booking
            </Link>
          </div>
        )}

        {/* ── Settings + user + logout ──────────────────────────────────── */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <InitialsAvatar
              name={user.name}
              className="h-9 w-9 !bg-gradient-to-br !from-blue-500 !to-indigo-600 !text-white shadow-inner"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${roleMeta.dark}`}>
                {roleMeta.label}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-sidebar-item-hover hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Brand wordmark */}
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm font-bold tracking-tight text-foreground">LuxeResort OS</span>
          </div>

          {/* Search */}
          <div className="relative ml-1 hidden max-w-xs flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="search"
              placeholder="Search operations…"
              className="h-9 w-full rounded-lg border border-border bg-secondary/60 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="hidden text-xs text-muted-foreground md:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>

          <div className="flex-1" />

          {/* Right-side actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            {canAccessPath(user.role, '/settings') && (
              <Link
                to="/settings"
                title="Settings"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-[18px] w-[18px]" />
              </Link>
            )}
            <div className="ml-1 hidden items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-3 sm:flex">
              <InitialsAvatar name={user.name} className="h-7 w-7 !bg-gradient-to-br !from-blue-500 !to-indigo-600 !text-white" />
              <span className="text-sm font-medium text-foreground">{user.name.split(' ')[0]}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleMeta.light}`}>
                {roleMeta.label}
              </span>
            </div>
          </div>
        </header>

        {/* ── Page content ───────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto">
          <div className="page-enter min-h-full p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
