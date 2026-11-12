import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';
import { DashboardPage } from './pages/main/DashboardPage';
import { FloodPredictionPage } from './pages/main/FloodPredictionPage';
import { FloodMapPage } from './pages/main/FloodMapPage';
import { RemoteSensingPage } from './pages/main/RemoteSensingPage';
import { HealthRiskPage } from './pages/main/HealthRiskPage';
import { AlertsPage } from './pages/main/AlertsPage';
import { EmergencyResponsePage } from './pages/main/EmergencyResponsePage';
import { AnalyticsPage } from './pages/main/AnalyticsPage';
import { ReportsPage } from './pages/main/ReportsPage';
import { DataManagementPage } from './pages/main/DataManagementPage';
import { SettingsPage } from './pages/main/SettingsPage';
import { UserManagementPage } from './pages/main/UserManagementPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Main Disaster Command Application Routes */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="flood-prediction" element={<FloodPredictionPage />} />
            <Route path="flood-map" element={<FloodMapPage />} />
            <Route path="remote-sensing" element={<RemoteSensingPage />} />
            <Route path="health-risk" element={<HealthRiskPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="emergency-response" element={<EmergencyResponsePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="data-management" element={<DataManagementPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="user-management" element={<UserManagementPage />} />
            <Route path="unauthorized" element={<UnauthorizedPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
