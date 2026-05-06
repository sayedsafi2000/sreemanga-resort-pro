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
} from 'lucide-react';

export type StaffRole =
  | 'SUPER_ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPING'
  | 'RESTAURANT_STAFF'
  | 'ACCOUNTANT';

export type SidebarItem = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  tab?: string;
  openNewBooking?: boolean;
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
  '/users': ['SUPER_ADMIN'],
  '/reports': ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/settings': ['SUPER_ADMIN'],
  '/gallery': ['SUPER_ADMIN'],
  '/nearby-explore': ['SUPER_ADMIN'],
  '/blogs': ['SUPER_ADMIN', 'MANAGER'],
  '/expenditures': ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/staff-salaries': ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/unauthorized': allRoles,
};

export function canAccessPath(role: string | undefined, path: string): boolean {
  if (!role) return false;
  const clean = path.split('?')[0];
  const allowed = ROUTE_ACCESS[clean];
  if (!allowed) return true;
  return allowed.includes(role as StaffRole);
}

export function getSidebarItems(role: string | undefined): SidebarItem[] {
  if (!role) return [];
  const r = role as StaffRole;

  const base: Record<StaffRole, SidebarItem[]> = {
    SUPER_ADMIN: [
      { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { key: 'rooms', label: 'Rooms Management', path: '/rooms', icon: BedDouble },
      { key: 'book', label: 'Bookings', path: '/bookings', icon: CalendarCheck },
      { key: 'guest', label: 'Guests', path: '/guests', icon: Users },
      { key: 'pay', label: 'Payments', path: '/payments', icon: DollarSign },
      { key: 'rest', label: 'Restaurant', path: '/restaurant', icon: UtensilsCrossed },
      { key: 'exp', label: 'Expenditures', path: '/expenditures', icon: Wallet },
      { key: 'sal', label: 'Staff Salaries', path: '/staff-salaries', icon: Banknote },
      { key: 'gal', label: 'Site gallery', path: '/gallery', icon: Images },
      { key: 'near', label: 'Nearby explore', path: '/nearby-explore', icon: Compass },
      { key: 'blog', label: 'Blog Posts', path: '/blogs', icon: FileText },
      { key: 'staff', label: 'Staff Management', path: '/users', icon: UserCog },
      { key: 'rep', label: 'Reports', path: '/reports', icon: BarChart3 },
      { key: 'set', label: 'Settings', path: '/settings', icon: Settings },
    ],
    MANAGER: [
      { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { key: 'rooms', label: 'Rooms', path: '/rooms', icon: BedDouble },
      { key: 'book', label: 'Bookings', path: '/bookings', icon: CalendarCheck },
      { key: 'guest', label: 'Guests', path: '/guests', icon: Users },
      { key: 'pay', label: 'Payments', path: '/payments', icon: DollarSign },
      { key: 'rest', label: 'Restaurant', path: '/restaurant', icon: UtensilsCrossed },
      { key: 'exp', label: 'Expenditures', path: '/expenditures', icon: Wallet },
      { key: 'sal', label: 'Staff Salaries', path: '/staff-salaries', icon: Banknote },
      { key: 'blog', label: 'Blog Posts', path: '/blogs', icon: FileText },
      { key: 'rep', label: 'Reports', path: '/reports', icon: BarChart3 },
    ],
    RECEPTIONIST: [
      { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { key: 'rooms', label: 'Room Availability', path: '/rooms', icon: BedDouble },
      { key: 'book-new', label: 'New Booking', path: '/bookings', icon: ClipboardPlus, openNewBooking: true },
      { key: 'book-all', label: 'All Bookings', path: '/bookings', icon: ListChecks },
      { key: 'guest', label: 'Guests', path: '/guests', icon: Users },
      { key: 'pay', label: 'Payments', path: '/payments', icon: DollarSign },
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
      { key: 'exp', label: 'Expenditures', path: '/expenditures', icon: Wallet },
      { key: 'sal', label: 'Staff Salaries', path: '/staff-salaries', icon: Banknote },
      { key: 'rep', label: 'Reports', path: '/reports', icon: BarChart3 },
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
  if (item.tab) return `${item.path}?tab=${item.tab}`;
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
