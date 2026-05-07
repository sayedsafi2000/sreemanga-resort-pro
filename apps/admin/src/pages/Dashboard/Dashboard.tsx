import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BedDouble, CalendarCheck, Users, DollarSign, TrendingUp, Clock, UtensilsCrossed } from 'lucide-react';

// Single shape covering all roles. Fields stay 0 when the role doesn't fetch them
// so consumers can read every key without optional-chaining gymnastics.
interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  totalBookings: number;
  pendingBookings: number;
  totalGuests: number;
  totalRevenue: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  menuItems: number;
  pendingOrders: number;
}

const EMPTY_STATS: DashboardStats = {
  totalRooms: 0,
  occupiedRooms: 0,
  totalBookings: 0,
  pendingBookings: 0,
  totalGuests: 0,
  totalRevenue: 0,
  todayCheckIns: 0,
  todayCheckOuts: 0,
  menuItems: 0,
  pendingOrders: 0,
};

const todayStr = () => new Date().toISOString().split('T')[0];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const t = todayStr();
        const base: DashboardStats = { ...EMPTY_STATS };

        if (role === 'HOUSEKEEPING') {
          const roomsRes = await api.get('/rooms');
          const rooms = unwrapList<any>(roomsRes, ['rooms']);
          base.totalRooms = rooms.length;
          base.occupiedRooms = rooms.filter((r: any) => r.status === 'BOOKED').length;
        } else if (role === 'RESTAURANT_STAFF') {
          const [mRes, oRes] = await Promise.all([
            api.get('/restaurant/menu'),
            api.get('/restaurant/orders'),
          ]);
          base.menuItems = unwrapList<any>(mRes, ['menuItems']).length;
          const orders = unwrapList<any>(oRes, ['orders']);
          base.pendingOrders = orders.filter((o: any) => o.status === 'PENDING').length;
        } else if (role === 'ACCOUNTANT') {
          const [payRes, revRes] = await Promise.all([
            api.get('/payments'),
            api.get('/reports/revenue'),
          ]);
          const payments = unwrapList<any>(payRes, ['payments']);
          base.totalRevenue = Number(revRes.data?.totalRevenue ?? 0);
          base.pendingBookings = payments.filter((p: any) => p.status === 'PENDING').length;
          base.totalBookings = payments.filter((p: any) => p.status === 'COMPLETED').length;
        } else if (role === 'RECEPTIONIST') {
          const [roomsRes, bookingsRes, guestsRes] = await Promise.all([
            api.get('/rooms'), api.get('/bookings'), api.get('/guests'),
          ]);
          const rooms = unwrapList<any>(roomsRes, ['rooms']);
          const bookings = unwrapList<any>(bookingsRes, ['bookings']);
          const guests = unwrapList<any>(guestsRes, ['guests']);
          base.totalRooms = rooms.length;
          base.occupiedRooms = rooms.filter((r: any) => r.status === 'BOOKED').length;
          base.totalBookings = bookings.length;
          base.pendingBookings = bookings.filter((b: any) => b.status === 'PENDING').length;
          base.totalGuests = guests.length;
          base.todayCheckIns = bookings.filter((b: any) => new Date(b.checkInDate).toISOString().split('T')[0] === t).length;
          base.todayCheckOuts = bookings.filter((b: any) => new Date(b.checkOutDate).toISOString().split('T')[0] === t).length;
        } else {
          const [roomsRes, bookingsRes, guestsRes, paymentsRes] = await Promise.all([
            api.get('/rooms'), api.get('/bookings'), api.get('/guests'), api.get('/payments'),
          ]);
          const rooms = unwrapList<any>(roomsRes, ['rooms']);
          const bookings = unwrapList<any>(bookingsRes, ['bookings']);
          const guests = unwrapList<any>(guestsRes, ['guests']);
          const payments = unwrapList<any>(paymentsRes, ['payments']);
          base.totalRooms = rooms.length;
          base.occupiedRooms = rooms.filter((r: any) => r.status === 'BOOKED').length;
          base.totalBookings = bookings.length;
          base.pendingBookings = bookings.filter((b: any) => b.status === 'PENDING').length;
          base.totalGuests = guests.length;
          base.totalRevenue = payments.filter((p: any) => p.status === 'COMPLETED').reduce((s: number, p: any) => s + (p.amount || 0), 0);
          base.todayCheckIns = bookings.filter((b: any) => new Date(b.checkInDate).toISOString().split('T')[0] === t).length;
          base.todayCheckOuts = bookings.filter((b: any) => new Date(b.checkOutDate).toISOString().split('T')[0] === t).length;
        }

        setStats(base);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    if (role) fetchStats();
  }, [user?.role]);

  let statCards: { title: string; value: string | number; sub: string; icon: typeof BedDouble; color: string }[];

  if (role === 'HOUSEKEEPING') {
    statCards = [
      { title: 'Total Rooms', value: stats.totalRooms, sub: `${stats.occupiedRooms} booked`, icon: BedDouble, color: 'text-blue-600' },
    ];
  } else if (role === 'RESTAURANT_STAFF') {
    statCards = [
      { title: 'Menu items', value: stats.menuItems ?? 0, sub: 'Active menu', icon: UtensilsCrossed, color: 'text-orange-600' },
      { title: 'Pending orders', value: stats.pendingOrders ?? 0, sub: 'Needs attention', icon: CalendarCheck, color: 'text-amber-600' },
    ];
  } else if (role === 'ACCOUNTANT') {
    statCards = [
      { title: 'Revenue', value: `৳${stats.totalRevenue.toLocaleString()}`, sub: 'From reports', icon: DollarSign, color: 'text-emerald-600' },
      { title: 'Completed payments', value: stats.totalBookings, sub: 'Count', icon: CalendarCheck, color: 'text-green-600' },
      { title: 'Pending payments', value: stats.pendingBookings, sub: 'Count', icon: TrendingUp, color: 'text-orange-600' },
    ];
  } else if (role === 'RECEPTIONIST') {
    statCards = [
      { title: 'Total Rooms', value: stats.totalRooms, sub: `${stats.occupiedRooms} booked`, icon: BedDouble, color: 'text-blue-600' },
      { title: 'Bookings', value: stats.totalBookings, sub: `${stats.pendingBookings} pending`, icon: CalendarCheck, color: 'text-green-600' },
      { title: 'Guests', value: stats.totalGuests, sub: 'Registered', icon: Users, color: 'text-purple-600' },
      { title: 'Check-ins Today', value: stats.todayCheckIns, sub: 'Arrivals', icon: TrendingUp, color: 'text-orange-600' },
      { title: 'Check-outs Today', value: stats.todayCheckOuts, sub: 'Departures', icon: Clock, color: 'text-red-600' },
    ];
  } else {
    statCards = [
      { title: 'Total Rooms', value: stats.totalRooms, sub: `${stats.occupiedRooms} booked`, icon: BedDouble, color: 'text-blue-600' },
      { title: 'Bookings', value: stats.totalBookings, sub: `${stats.pendingBookings} pending`, icon: CalendarCheck, color: 'text-green-600' },
      { title: 'Guests', value: stats.totalGuests, sub: 'Total registered', icon: Users, color: 'text-purple-600' },
      { title: 'Revenue', value: `৳${stats.totalRevenue.toLocaleString()}`, sub: 'Total collected', icon: DollarSign, color: 'text-emerald-600' },
      { title: 'Check-ins Today', value: stats.todayCheckIns, sub: 'Expected arrivals', icon: TrendingUp, color: 'text-orange-600' },
      { title: 'Check-outs Today', value: stats.todayCheckOuts, sub: 'Expected departures', icon: Clock, color: 'text-red-600' },
    ];
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
