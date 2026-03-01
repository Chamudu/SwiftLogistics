import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';

// Shared pages
import Login from './pages/Login';
import Register from './pages/Register';
import NewOrder from './pages/NewOrder';
import Orders from './pages/Orders';
import Settings from './pages/Settings';

// Role-specific pages
import AdminDashboard from './pages/Dashboard';
import Warehouse from './pages/admin/Warehouse';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import TrackOrder from './pages/customer/TrackOrder';
import DriverDashboard from './pages/driver/DriverDashboard';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Role-based Dashboard switcher
const DashboardRouter = () => {
  const { user } = useAuth();
  switch (user?.role) {
    case 'customer': return <CustomerDashboard />;
    case 'driver': return <DriverDashboard />;
    case 'admin':
    default: return <AdminDashboard />;
  }
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Register />
      } />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardRouter />} />
        <Route path="new-order" element={<NewOrder />} />
        <Route path="orders" element={<Orders />} />
        <Route path="track" element={<TrackOrder />} />
        <Route path="warehouse" element={
          <ProtectedRoute>
            {/* Normally we'd check for admin role here */}
            <Warehouse />
          </ProtectedRoute>
        } />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
