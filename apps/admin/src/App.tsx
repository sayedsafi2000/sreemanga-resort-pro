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
import Settings from '@/pages/Settings/Settings';
import Users from '@/pages/Users/Users';
import Reports from '@/pages/Reports/Reports';
import Gallery from '@/pages/Gallery/Gallery';
import NearbyExplore from '@/pages/NearbyExplore/NearbyExplore';
import Blogs from '@/pages/Blogs/Blogs';
import Expenditures from '@/pages/Expenditures/Expenditures';
import StaffSalaries from '@/pages/StaffSalaries/StaffSalaries';
import Unauthorized from '@/pages/Unauthorized/Unauthorized';
import Layout from '@/components/layout/Layout';
import RoleGuard from '@/components/RoleGuard';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
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
        <Route path="/gallery" element={<ProtectedRoute><RoleGuard path="/gallery"><Gallery /></RoleGuard></ProtectedRoute>} />
        <Route path="/nearby-explore" element={<ProtectedRoute><RoleGuard path="/nearby-explore"><NearbyExplore /></RoleGuard></ProtectedRoute>} />
        <Route path="/blogs" element={<ProtectedRoute><RoleGuard path="/blogs"><Blogs /></RoleGuard></ProtectedRoute>} />
        <Route path="/expenditures" element={<ProtectedRoute><RoleGuard path="/expenditures"><Expenditures /></RoleGuard></ProtectedRoute>} />
        <Route path="/staff-salaries" element={<ProtectedRoute><RoleGuard path="/staff-salaries"><StaffSalaries /></RoleGuard></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><RoleGuard path="/settings"><Settings /></RoleGuard></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><RoleGuard path="/users"><Users /></RoleGuard></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><RoleGuard path="/reports"><Reports /></RoleGuard></ProtectedRoute>} />
        <Route path="/unauthorized" element={<ProtectedRoute><Unauthorized /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
};

export default App;
