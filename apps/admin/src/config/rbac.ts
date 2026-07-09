import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  Users,
  DollarSign,
  UtensilsCrossed,
  Settings,
  UserCog,
  BarChart3,
  ClipboardPlus,
  ListChecks,
  ShoppingBag,
  Images,
  Compass,
  FileText,
  Wallet,
  Banknote,
  Layout,
  Palette,
  Sun,
  Boxes,
  Landmark,
  PieChart,
  Users2,
  ScrollText,
} from 'lucide-react';

export type StaffRole =
  | 'SUPER_ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPING'
  | 'RESTAURANT_STAFF'
  | 'ACCOUNTANT'
  | 'SHAREHOLDER';

export type SidebarItem = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  tab?: string;
  openNewBooking?: boolean;
};

/** Sidebar section labels keyed by item.key — used to group the nav for clarity. */
export const SIDEBAR_SECTION: Record<string, string> = {
  dash: '', 'book-new': '',
  rooms: 'Operations', book: 'Operations', 'book-all': 'Operations', guest: 'Operations',
  rest: 'Operations', daylong: 'Operations', ord: 'Operations', menu: 'Operations', inv: 'Operations',
  pay: 'Finance', acct: 'Finance', share: 'Finance', rep: 'Finance', exp: 'Finance',
  hr: 'People', sal: 'People', staff: 'People',
  gal: 'Content', near: 'Content', blog: 'Content',
  brand: 'System', tmpl: 'System', audit: 'System', set: 'System',
  portal: '',
};

/** Layout renders category children under this key (fetched from API). */
export const EXPENDITURE_SIDEBAR_KEY = 'exp';

const expenditureParent: SidebarItem = {
  key: EXPENDITURE_SIDEBAR_KEY,
  label: 'Expenditures',
  path: '/expenditures',
  icon: Wallet,
  tab: 'expenses',
};

const allRoles: StaffRole[] = [
  'SUPER_ADMIN',
  'MANAGER',
  'RECEPTIONIST',
  'HOUSEKEEPING',
  'RESTAURANT_STAFF',
  'ACCOUNTANT',
];

export const ROUTE_ACCESS: Record<string, StaffRole[]> = {
  '/dashboard': allRoles,
  '/rooms': ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'],
  '/bookings': ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST'],
  '/guests': ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST'],
  '/payments': ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTIONIST'],
  '/restaurant': ['SUPER_ADMIN', 'MANAGER', 'RESTAURANT_STAFF'],
  '/day-long': ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST'],
  '/inventory': ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'HOUSEKEEPING', 'RESTAURANT_STAFF'],
  '/accounts': ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/shareholders': ['SUPER_ADMIN', 'MANAGER'],
  '/staff-hr': ['SUPER_ADMIN', 'MANAGER'],
  '/audit-log': ['SUPER_ADMIN'],
  '/users': ['SUPER_ADMIN'],
  '/reports': ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/templates': ['SUPER_ADMIN'],
  '/branding': ['SUPER_ADMIN', 'MANAGER'],
  '/settings': ['SUPER_ADMIN'],
  '/gallery': ['SUPER_ADMIN'],
  '/nearby-explore': ['SUPER_ADMIN'],
  '/blogs': ['SUPER_ADMIN', 'MANAGER'],
  '/expenditures': ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/staff-salaries': ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/portal': ['SHAREHOLDER'],
  '/unauthorized': [...allRoles, 'SHAREHOLDER'],
};

export function canAccessPath(role: string | undefined, path: string): boolean {
  if (!role) return false;
  const clean = path.split('?')[0];
  const allowed = ROUTE_ACCESS[clean];
  if (!allowed) return true;
  return allowed.includes(role as StaffRole);
}

/** Where a user lands after login. Shareholders get their portal, staff the dashboard. */
export function landingPath(role: string | undefined): string {
  return role === 'SHAREHOLDER' ? '/portal' : '/dashboard';
}

export function getSidebarItems(role: string | undefined): SidebarItem[] {
  if (!role) return [];
  const r = role as StaffRole;

  const base: Record<StaffRole, SidebarItem[]> = {
    SUPER_ADMIN: [
      { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      // Operations
      { key: 'rooms', label: 'Rooms Management', path: '/rooms', icon: BedDouble },
      { key: 'book', label: 'Bookings', path: '/bookings', icon: CalendarCheck },
      { key: 'guest', label: 'Guests', path: '/guests', icon: Users },
      { key: 'rest', label: 'Restaurant', path: '/restaurant', icon: UtensilsCrossed },
      { key: 'daylong', label: 'Day Long', path: '/day-long', icon: Sun },
      { key: 'inv', label: 'Inventory', path: '/inventory', icon: Boxes },
      // Finance
      { key: 'pay', label: 'Payments', path: '/payments', icon: DollarSign },
      { key: 'acct', label: 'Accounts', path: '/accounts', icon: Landmark },
      expenditureParent,
      { key: 'share', label: 'Shareholders', path: '/shareholders', icon: PieChart },
      { key: 'rep', label: 'Reports', path: '/reports', icon: BarChart3 },
      // People
      { key: 'hr', label: 'Staff HR', path: '/staff-hr', icon: Users2 },
      { key: 'sal', label: 'Staff Salaries', path: '/staff-salaries', icon: Banknote },
      { key: 'staff', label: 'User Accounts', path: '/users', icon: UserCog },
      // Content
      { key: 'gal', label: 'Site gallery', path: '/gallery', icon: Images },
      { key: 'near', label: 'Nearby explore', path: '/nearby-explore', icon: Compass },
      { key: 'blog', label: 'Blog Posts', path: '/blogs', icon: FileText },
      // System
      { key: 'brand', label: 'Branding', path: '/branding', icon: Palette },
      { key: 'tmpl', label: 'Website Templates', path: '/templates', icon: Layout },
      { key: 'audit', label: 'Audit Log', path: '/audit-log', icon: ScrollText },
      { key: 'set', label: 'Settings', path: '/settings', icon: Settings },
    ],
    MANAGER: [
      { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      // Operations
      { key: 'rooms', label: 'Rooms', path: '/rooms', icon: BedDouble },
      { key: 'book', label: 'Bookings', path: '/bookings', icon: CalendarCheck },
      { key: 'guest', label: 'Guests', path: '/guests', icon: Users },
      { key: 'rest', label: 'Restaurant', path: '/restaurant', icon: UtensilsCrossed },
      { key: 'daylong', label: 'Day Long', path: '/day-long', icon: Sun },
      { key: 'inv', label: 'Inventory', path: '/inventory', icon: Boxes },
      // Finance
      { key: 'pay', label: 'Payments', path: '/payments', icon: DollarSign },
      { key: 'acct', label: 'Accounts', path: '/accounts', icon: Landmark },
      expenditureParent,
      { key: 'share', label: 'Shareholders', path: '/shareholders', icon: PieChart },
      { key: 'rep', label: 'Reports', path: '/reports', icon: BarChart3 },
      // People
      { key: 'hr', label: 'Staff HR', path: '/staff-hr', icon: Users2 },
      { key: 'sal', label: 'Staff Salaries', path: '/staff-salaries', icon: Banknote },
      // Content
      { key: 'blog', label: 'Blog Posts', path: '/blogs', icon: FileText },
      // System
      { key: 'brand', label: 'Branding', path: '/branding', icon: Palette },
    ],
    RECEPTIONIST: [
      { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { key: 'rooms', label: 'Room Availability', path: '/rooms', icon: BedDouble },
      { key: 'book-new', label: 'New Booking', path: '/bookings', icon: ClipboardPlus, openNewBooking: true },
      { key: 'book-all', label: 'All Bookings', path: '/bookings', icon: ListChecks },
      { key: 'guest', label: 'Guests', path: '/guests', icon: Users },
      { key: 'pay', label: 'Payments', path: '/payments', icon: DollarSign },
      { key: 'daylong', label: 'Day Long', path: '/day-long', icon: Sun },
    ],
    HOUSEKEEPING: [
      { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { key: 'rooms', label: 'Room Status', path: '/rooms', icon: BedDouble },
    ],
    RESTAURANT_STAFF: [
      { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { key: 'ord', label: 'Orders', path: '/restaurant', icon: ShoppingBag, tab: 'orders' },
      { key: 'menu', label: 'Menu', path: '/restaurant', icon: UtensilsCrossed, tab: 'menu' },
    ],
    ACCOUNTANT: [
      { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { key: 'pay', label: 'Payments', path: '/payments', icon: DollarSign },
      { key: 'inv', label: 'Inventory', path: '/inventory', icon: Boxes },
      { key: 'acct', label: 'Accounts', path: '/accounts', icon: Landmark },
      expenditureParent,
      { key: 'sal', label: 'Staff Salaries', path: '/staff-salaries', icon: Banknote },
      { key: 'rep', label: 'Reports', path: '/reports', icon: BarChart3 },
    ],
    SHAREHOLDER: [
      { key: 'portal', label: 'My Portal', path: '/portal', icon: PieChart },
    ],
  };

  return base[r] ?? [];
}

export function sidebarItemActive(pathname: string, search: string, item: SidebarItem): boolean {
  if (pathname !== item.path) return false;
  const q = new URLSearchParams(search);
  if (item.openNewBooking) return q.get('new') === '1';
  if (item.key === 'book-all') return q.get('new') !== '1';
  if (item.tab) return q.get('tab') === item.tab;
  if (item.path === '/restaurant' && !item.tab)
    return !q.get('tab') || q.get('tab') === 'menu';
  return true;
}

export function navItemHref(item: SidebarItem): string {
  if (item.openNewBooking) return `${item.path}?new=1`;
  if (item.tab) return `${item.path}?tab=${encodeURIComponent(item.tab)}`;
  return item.path;
}

export function canManageRooms(role: string | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'MANAGER';
}

export function canManageRestaurantMenu(role: string | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'MANAGER';
}

export function canEditPayments(role: string | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'ACCOUNTANT';
}
