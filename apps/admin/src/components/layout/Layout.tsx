import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Menu, X, Mountain, ChevronDown, ChevronUp, Plus, Bell, Settings, Search, CalendarCheck, DollarSign, BedDouble, UtensilsCrossed, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getSidebarItems, navItemHref, sidebarItemActive, canAccessPath, EXPENDITURE_SIDEBAR_KEY } from '@/config/rbac';
import { InitialsAvatar } from '@/components/ui/avatar';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';

type ExpNavCat = { id: string; name: string; sortOrder: number };

// ── Notification types ────────────────────────────────────────────────────────
type NotifItem = {
  id: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  body: string;
  href: string;
  time: string;
};

function useNotifications(role: string | undefined) {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    if (!role) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const notifs: NotifItem[] = [];

      // Pending bookings
      if (['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(role)) {
        const bRes = await api.get('/bookings');
        const bookings = unwrapList<any>(bRes, ['bookings']);
        const pending = bookings.filter((b: any) => b.status === 'PENDING');
        const todayCI = bookings.filter((b: any) =>
          b.status === 'CONFIRMED' && new Date(b.checkInDate).toISOString().split('T')[0] === today
        );
        const todayCO = bookings.filter((b: any) =>
          b.status === 'CHECKED_IN' && new Date(b.checkOutDate).toISOString().split('T')[0] === today
        );
        if (pending.length > 0) notifs.push({
          id: 'pending-bookings',
          icon: <CalendarCheck className="h-4 w-4" />,
          color: 'bg-amber-100 text-amber-600',
          title: `${pending.length} Pending Booking${pending.length > 1 ? 's' : ''}`,
          body: 'Waiting for your approval',
          href: '/bookings',
          time: 'Now',
        });
        if (todayCI.length > 0) notifs.push({
          id: 'checkins-today',
          icon: <BedDouble className="h-4 w-4" />,
          color: 'bg-emerald-100 text-emerald-600',
          title: `${todayCI.length} Check-in${todayCI.length > 1 ? 's' : ''} Today`,
          body: 'Guests arriving today',
          href: '/bookings',
          time: 'Today',
        });
        if (todayCO.length > 0) notifs.push({
          id: 'checkouts-today',
          icon: <BedDouble className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-600',
          title: `${todayCO.length} Check-out${todayCO.length > 1 ? 's' : ''} Today`,
          body: 'Guests departing today',
          href: '/bookings',
          time: 'Today',
        });
      }

      // Pending payments
      if (['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTIONIST'].includes(role)) {
        const pRes = await api.get('/payments');
        const payments = unwrapList<any>(pRes, ['payments']);
        const pendingPay = payments.filter((p: any) => p.status === 'PENDING');
        if (pendingPay.length > 0) notifs.push({
          id: 'pending-payments',
          icon: <DollarSign className="h-4 w-4" />,
          color: 'bg-rose-100 text-rose-600',
          title: `${pendingPay.length} Pending Payment${pendingPay.length > 1 ? 's' : ''}`,
          body: 'Awaiting collection',
          href: '/payments',
          time: 'Now',
        });
      }

      // Pending restaurant orders
      if (['SUPER_ADMIN', 'MANAGER', 'RESTAURANT_STAFF'].includes(role)) {
        const oRes = await api.get('/restaurant/orders');
        const orders = unwrapList<any>(oRes, ['orders']);
        const pendingOrders = orders.filter((o: any) => o.status === 'PENDING');
        if (pendingOrders.length > 0) notifs.push({
          id: 'pending-orders',
          icon: <UtensilsCrossed className="h-4 w-4" />,
          color: 'bg-orange-100 text-orange-600',
          title: `${pendingOrders.length} New Order${pendingOrders.length > 1 ? 's' : ''}`,
          body: 'Restaurant orders need attention',
          href: '/restaurant?tab=orders',
          time: 'Now',
        });
      }

      // Rooms needing cleaning
      if (['SUPER_ADMIN', 'MANAGER', 'HOUSEKEEPING'].includes(role)) {
        const rRes = await api.get('/rooms');
        const rooms = unwrapList<any>(rRes, ['rooms']);
        const cleaning = rooms.filter((r: any) => r.status === 'CLEANING');
        const maintenance = rooms.filter((r: any) => r.status === 'MAINTENANCE');
        if (cleaning.length > 0) notifs.push({
          id: 'rooms-cleaning',
          icon: <BedDouble className="h-4 w-4" />,
          color: 'bg-yellow-100 text-yellow-600',
          title: `${cleaning.length} Room${cleaning.length > 1 ? 's' : ''} Need Cleaning`,
          body: 'Housekeeping required',
          href: '/rooms',
          time: 'Now',
        });
        if (maintenance.length > 0) notifs.push({
          id: 'rooms-maintenance',
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'bg-red-100 text-red-600',
          title: `${maintenance.length} Room${maintenance.length > 1 ? 's' : ''} Under Maintenance`,
          body: 'Rooms offline for repairs',
          href: '/rooms',
          time: 'Now',
        });
      }

      setItems(notifs);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    // Refresh every 2 minutes
    const t = setInterval(fetch, 120_000);
    return () => clearInterval(t);
  }, [role]);

  return { items, loading, refetch: fetch };
}

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
              ? 'bg-sidebar-item-active text-white shadow-sm shadow-amber-900/50'
              : isAnyActive
              ? 'bg-sidebar-accent text-slate-200'
              : 'text-sidebar-text hover:bg-sidebar-item-hover hover:text-white'
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
                    ? 'bg-primary/20 text-amber-300'
                    : 'text-sidebar-text hover:bg-sidebar-item-hover hover:text-white'
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
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [brandingSettings, setBrandingSettings] = useState<{
    site_name: string;
    site_tagline: string;
    site_logo: string;
  }>({ site_name: 'Pina Vista', site_tagline: 'Resort Management System', site_logo: '' });
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { items: notifItems, loading: notifLoading, refetch: refetchNotifs } = useNotifications(user?.role);

  // Close notif panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  // Load branding settings
  useEffect(() => {
    if (user) {
      api.get('/branding').then((res) => {
        if (res.data?.settings) {
          const settings = res.data.settings;
          setBrandingSettings({
            site_name: settings.site_name || 'Pina Vista',
            site_tagline: settings.site_tagline || 'Resort Management System',
            site_logo: settings.site_logo || '',
          });
          
          // Update favicon
          if (settings.site_favicon) {
            const favicon = document.getElementById('favicon') as HTMLLinkElement;
            if (favicon) favicon.href = settings.site_favicon;
          }
          
          // Update title
          if (settings.site_name) {
            document.title = `${settings.site_name} - Admin Panel`;
          }
        }
      }).catch(() => {});
    }
  }, [user]);

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
          {brandingSettings.site_logo ? (
            <img src={brandingSettings.site_logo} alt="Logo" className="h-10 w-10 rounded-xl object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <Mountain className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-white">Resort Management System</p>
            <p className="eyebrow !text-[10px] !tracking-[0.12em] text-slate-500">{brandingSettings.site_name}</p>
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
                    ? 'bg-sidebar-item-active text-white shadow-sm shadow-amber-900/50'
                    : 'text-sidebar-text hover:bg-sidebar-item-hover hover:text-white'
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sidebar-item-active px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-900/40 transition hover:opacity-90 active:scale-[0.98]"
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
        <header className="relative z-30 flex shrink-0 items-center gap-3 border-b border-border bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Brand wordmark */}
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm font-bold tracking-tight text-foreground">{brandingSettings.site_name}</span>
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
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                title="Notifications"
                onClick={() => { setNotifOpen(v => !v); if (!notifOpen) refetchNotifs(); }}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Bell className="h-[18px] w-[18px]" />
                {notifItems.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-red-500">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-11 z-[9999] w-80 rounded-xl border border-border bg-white shadow-xl ring-1 ring-black/5 sm:w-96">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Notifications</span>
                      {notifItems.length > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{notifItems.length}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifLoading ? (
                      <div className="space-y-3 p-4">
                        {[1,2,3].map(i => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg shimmer shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 w-3/4 rounded shimmer" />
                              <div className="h-2.5 w-1/2 rounded shimmer" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : notifItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">No pending actions</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifItems.map((item) => (
                          <Link
                            key={item.id}
                            to={item.href}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                              {item.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.body}</p>
                            </div>
                            <span className="shrink-0 text-[10px] text-muted-foreground/60 mt-0.5">{item.time}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-border px-4 py-2.5">
                    <Link
                      to="/bookings"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View all activity →
                    </Link>
                  </div>
                </div>
              )}
            </div>
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
