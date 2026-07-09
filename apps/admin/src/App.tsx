import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login/Login';
import Dashboard from '@/pages/Dashboard/Dashboard';
import Rooms from '@/pages/Rooms/Rooms';
import Bookings from '@/pages/Bookings/Bookings';
import Guests from '@/pages/Guests/Guests';
import Payments from '@/pages/Payments/Payments';
import Restaurant from '@/pages/Restaurant/Restaurant';
import DayLong from '@/pages/DayLong/DayLong';
import Inventory from '@/pages/Inventory/Inventory';
import Accounts from '@/pages/Accounts/Accounts';
import Shareholders from '@/pages/Shareholders/Shareholders';
import StaffHR from '@/pages/StaffHR/StaffHR';
import Settings from '@/pages/Settings/Settings';
import Users from '@/pages/Users/Users';
import Reports from '@/pages/Reports/Reports';
import Gallery from '@/pages/Gallery/Gallery';
import NearbyExplore from '@/pages/NearbyExplore/NearbyExplore';
import Blogs from '@/pages/Blogs/Blogs';
import Expenditures from '@/pages/Expenditures/Expenditures';
import StaffSalaries from '@/pages/StaffSalaries/StaffSalaries';
import Branding from '@/pages/Branding/Branding';
import Unauthorized from '@/pages/Unauthorized/Unauthorized';
import Templates from '@/pages/Templates/Templates';
import Layout from '@/components/layout/Layout';
import RoleGuard from '@/components/RoleGuard';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><RoleGuard path="/dashboard"><Dashboard /></RoleGuard></ProtectedRoute>} />
        <Route path="/rooms" element={<ProtectedRoute><RoleGuard path="/rooms"><Rooms /></RoleGuard></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><RoleGuard path="/bookings"><Bookings /></RoleGuard></ProtectedRoute>} />
        <Route path="/guests" element={<ProtectedRoute><RoleGuard path="/guests"><Guests /></RoleGuard></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><RoleGuard path="/payments"><Payments /></RoleGuard></ProtectedRoute>} />
        <Route path="/restaurant" element={<ProtectedRoute><RoleGuard path="/restaurant"><Restaurant /></RoleGuard></ProtectedRoute>} />
        <Route path="/day-long" element={<ProtectedRoute><RoleGuard path="/day-long"><DayLong /></RoleGuard></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><RoleGuard path="/inventory"><Inventory /></RoleGuard></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute><RoleGuard path="/accounts"><Accounts /></RoleGuard></ProtectedRoute>} />
        <Route path="/shareholders" element={<ProtectedRoute><RoleGuard path="/shareholders"><Shareholders /></RoleGuard></ProtectedRoute>} />
        <Route path="/staff-hr" element={<ProtectedRoute><RoleGuard path="/staff-hr"><StaffHR /></RoleGuard></ProtectedRoute>} />
        <Route path="/gallery" element={<ProtectedRoute><RoleGuard path="/gallery"><Gallery /></RoleGuard></ProtectedRoute>} />
        <Route path="/nearby-explore" element={<ProtectedRoute><RoleGuard path="/nearby-explore"><NearbyExplore /></RoleGuard></ProtectedRoute>} />
        <Route path="/blogs" element={<ProtectedRoute><RoleGuard path="/blogs"><Blogs /></RoleGuard></ProtectedRoute>} />
        <Route path="/expenditures" element={<ProtectedRoute><RoleGuard path="/expenditures"><Expenditures /></RoleGuard></ProtectedRoute>} />
        <Route path="/staff-salaries" element={<ProtectedRoute><RoleGuard path="/staff-salaries"><StaffSalaries /></RoleGuard></ProtectedRoute>} />
        <Route path="/branding" element={<ProtectedRoute><RoleGuard path="/branding"><Branding /></RoleGuard></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><RoleGuard path="/templates"><Templates /></RoleGuard></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><RoleGuard path="/settings"><Settings /></RoleGuard></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><RoleGuard path="/users"><Users /></RoleGuard></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><RoleGuard path="/reports"><Reports /></RoleGuard></ProtectedRoute>} />
        <Route path="/unauthorized" element={<ProtectedRoute><Unauthorized /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
};

export default App;
