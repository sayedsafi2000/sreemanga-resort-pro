import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Menu, X, TreePine, ChevronDown, ChevronUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getSidebarItems, navItemHref, sidebarItemActive, EXPENDITURE_SIDEBAR_KEY } from '@/config/rbac';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';

type ExpNavCat = { id: string; name: string; sortOrder: number };

// ── Role badge styling ────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN:      { label: 'Super Admin',     color: 'bg-violet-500/20 text-violet-300' },
  MANAGER:          { label: 'Manager',          color: 'bg-blue-500/20 text-blue-300' },
  RECEPTIONIST:     { label: 'Receptionist',     color: 'bg-emerald-500/20 text-emerald-300' },
  HOUSEKEEPING:     { label: 'Housekeeping',     color: 'bg-amber-500/20 text-amber-300' },
  RESTAURANT_STAFF: { label: 'Restaurant Staff', color: 'bg-orange-500/20 text-orange-300' },
  ACCOUNTANT:       { label: 'Accountant',       color: 'bg-teal-500/20 text-teal-300' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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
          className={`relative flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
            parentActive
              ? 'nav-active-indicator bg-white/10 text-white'
              : isAnyActive
              ? 'bg-white/6 text-slate-300'
              : 'text-sidebar-text hover:bg-sidebar-item-hover hover:text-slate-200'
          }`}
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
            parentActive ? 'bg-primary/20 text-primary' : 'text-inherit opacity-70'
          }`}>
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </Link>
        {categories.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mr-1 flex h-6 w-6 items-center justify-center rounded text-sidebar-text transition hover:text-slate-200"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {open && categories.length > 0 && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/8 pl-4">
          {categories.map((c) => {
            const href = `/expenditures?tab=expenses&categoryId=${encodeURIComponent(c.id)}`;
            const childOn = location.pathname === '/expenditures' && tab === 'expenses' && categoryId === c.id;
            return (
              <Link
                key={c.id}
                to={href}
                onClick={onNavigate}
                className={`block rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-150 ${
                  childOn
                    ? 'bg-primary/15 text-emerald-300'
                    : 'text-sidebar-text hover:bg-white/6 hover:text-slate-300'
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

  const roleMeta = ROLE_META[user.role] ?? { label: user.role, color: 'bg-white/10 text-white/70' };
  const sidebarItems = getSidebarItems(user.role);

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Mobile overlay ────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={`sidebar-scroll fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto transition-transform duration-300 ease-out lg:static lg:inset-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'hsl(var(--sidebar-bg))' }}
      >
        {/* ── Brand / Logo ─────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3 border-b px-5 py-5"
          style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/30">
            <TreePine className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">Nirjon's Hideout</p>
            <p className="text-[10px] font-medium uppercase tracking-widest"
              style={{ color: 'hsl(var(--sidebar-text))' }}>
              Admin Panel
            </p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/8 hover:text-white lg:hidden"
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
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'nav-active-indicator bg-white/10 text-white'
                    : 'text-sidebar-text hover:bg-white/6 hover:text-slate-200'
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                  isActive ? 'bg-primary/20 text-emerald-400' : 'opacity-70'
                }`}>
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── User profile ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-t p-3"
          style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white shadow-inner">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${roleMeta.color}`}>
                {roleMeta.label}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <header className="flex shrink-0 items-center gap-4 border-b border-border bg-white/80 px-5 py-3.5 backdrop-blur-sm">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Breadcrumb / greeting */}
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="flex-1" />

          {/* Right-side actions */}
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 sm:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[10px] font-bold text-white">
                {getInitials(user.name)}
              </div>
              <span className="text-sm font-medium text-foreground">{user.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                ROLE_META[user.role]?.color.replace('bg-', 'bg-').replace('/20', '/10').replace('text-', 'text-').replace('-300', '-700') ?? 'bg-muted text-muted-foreground'
              }`}>
                {roleMeta.label}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-destructive/8 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ── Page content ───────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto">
          <div className="page-enter min-h-full p-5 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
