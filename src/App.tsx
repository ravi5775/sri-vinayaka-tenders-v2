import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LoanProvider } from './contexts/LoanContext';
import { InvestorProvider } from './contexts/InvestorContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { LogoProvider } from './contexts/LogoContext';
import { ToastProvider } from './contexts/ToastContext';
import { SyncProvider } from './contexts/SyncContext';

import Header from './components/Header';
import Footer from './components/Footer';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboard from './pages/AdminDashboard';
import LoanForm from './pages/LoanForm';
import RepaymentPage from './pages/RepaymentPage';
import InvestorDashboard from './pages/InvestorDashboard';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const ProtectedRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/loan/new" element={<LoanForm />} />
          <Route path="/loan/edit/:id" element={<LoanForm />} />
          <Route path="/repayments" element={<RepaymentPage />} />
          <Route path="/investors" element={<InvestorDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Toast />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <SyncProvider>
          <AuthProvider>
              <LogoProvider>
                <LanguageProvider>
                  <ToastProvider>
                    <LoanProvider>
                      <InvestorProvider>
                        <NotificationProvider>
                          <AppRoutes />
                        </NotificationProvider>
                      </InvestorProvider>
                    </LoanProvider>
                  </ToastProvider>
                </LanguageProvider>
              </LogoProvider>
          </AuthProvider>
        </SyncProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
