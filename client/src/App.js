import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { IntelligenceProvider } from './context/IntelligenceContext';
import { BlockchainProvider } from './context/BlockchainContext';
import { AdminAuthProvider, useAdminAuth } from './admin/context/AdminAuthContext';
import Navbar from './components/Navbar';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import './App.css';

// Lazy-loaded pages — each becomes a separate chunk
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PropertyList = lazy(() => import('./pages/PropertyList'));
const PropertyDetails = lazy(() => import('./pages/PropertyDetails'));
const RegisterProperty = lazy(() => import('./pages/RegisterProperty'));
const TransferRequests = lazy(() => import('./pages/TransferRequests'));
const PaymentGateway = lazy(() => import('./pages/PaymentGateway'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Profile = lazy(() => import('./pages/Profile'));
const CommandCenterDashboard = lazy(() => import('./components/CommandCenterDashboard'));
const BlockExplorer = lazy(() => import('./pages/BlockExplorer'));
const KYCDashboard = lazy(() => import('./pages/KYCDashboard'));

// Admin portal — separate lazy chunks
const AdminLogin = lazy(() => import('./admin/pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'));

// Route-level loading fallback
const PageLoader = () => (
  <div className="loading" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
    <div className="loading-spinner" />
    <p style={{ color: '#64748B', fontSize: '0.875rem' }}>Loading...</p>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

/* Guard for admin-only routes */
const AdminPrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return <div className="loading" style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading-spinner" />
    </div>;
  }

  return isAuthenticated ? children : <Navigate to="/admin/login" />;
};

/* Wrap Command Center routes in BlockchainProvider — blockchain UI is isolated here */
const BlockchainRoute = ({ children }) => (
  <BlockchainProvider>
    {children}
  </BlockchainProvider>
);

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
      <div className="App">
        {!isAdminRoute && <Navbar />}
        <div className={`main-content ${isAuthenticated && !isAdminRoute ? '' : 'full-width'}`}>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/dashboard" element={
              <PrivateRoute><Dashboard /></PrivateRoute>
            } />

            <Route path="/profile" element={
              <PrivateRoute><Profile /></PrivateRoute>
            } />

            <Route path="/properties" element={
              <PrivateRoute><PropertyList /></PrivateRoute>
            } />

            <Route path="/properties/:id" element={
              <PrivateRoute><PropertyDetails /></PrivateRoute>
            } />

            <Route path="/register-property" element={
              <PrivateRoute><RegisterProperty /></PrivateRoute>
            } />

            <Route path="/transfers" element={
              <PrivateRoute><TransferRequests /></PrivateRoute>
            } />

            <Route path="/payment/:requestId" element={
              <PrivateRoute><PaymentGateway /></PrivateRoute>
            } />

            <Route path="/kyc" element={
              <PrivateRoute><KYCDashboard /></PrivateRoute>
            } />

            {/* Blockchain-aware routes — isolated */}
            <Route path="/command-center" element={
              <PrivateRoute><BlockchainRoute><CommandCenterDashboard /></BlockchainRoute></PrivateRoute>
            } />

            <Route path="/block-explorer" element={
              <PrivateRoute><BlockchainRoute><BlockExplorer /></BlockchainRoute></PrivateRoute>
            } />

            {/* ─── Admin Portal Routes (no public Navbar) ─── */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={
              <AdminPrivateRoute><AdminDashboard /></AdminPrivateRoute>
            } />
          </Routes>
          </Suspense>
        </div>
        {!isAdminRoute && <ToastContainer position="top-right" autoClose={3000} />}
        <SessionTimeoutWarning />
      </div>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <IntelligenceProvider>
          <AdminAuthProvider>
            <BlockchainProvider>
              <AppRoutes />
            </BlockchainProvider>
          </AdminAuthProvider>
        </IntelligenceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
