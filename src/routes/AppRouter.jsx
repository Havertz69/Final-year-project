import { Routes, Route, Navigate } from 'react-router-dom';
import AdminRoutes from './AdminRoutes';
import TenantRoutes from './TenantRoutes';
import AdminLayout from '../components/admin/AdminLayout';
import TenantLayout from '../components/tenant/TenantLayout';
import LoginPage from '../pages/auth/LoginPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import DashboardPage from '../pages/admin/DashboardPage';
import UnitsPage from '../pages/admin/UnitsPage';
import TenantsPage from '../pages/admin/TenantsPage';
import PaymentsPage from '../pages/admin/PaymentsPage';
import ReportsPage from '../pages/admin/ReportsPage';
import MaintenancePage from '../pages/admin/MaintenancePage';
import ChatbotPage from '../pages/admin/ChatbotPage';
import TenantDashboardPage from '../pages/tenant/TenantDashboardPage';
import TenantPaymentsPage from '../pages/tenant/TenantPaymentsPage';
import TenantMaintenancePage from '../pages/tenant/TenantMaintenancePage';
import TenantChatbotPage from '../pages/tenant/TenantChatbotPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/admin" element={<AdminRoutes />}>
        <Route element={<AdminLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="chatbot" element={<ChatbotPage />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>
      <Route path="/tenant" element={<TenantRoutes />}>
        <Route element={<TenantLayout />}>
          <Route path="dashboard" element={<TenantDashboardPage />} />
          <Route path="payments" element={<TenantPaymentsPage />} />
          <Route path="maintenance" element={<TenantMaintenancePage />} />
          <Route path="chatbot" element={<TenantChatbotPage />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
