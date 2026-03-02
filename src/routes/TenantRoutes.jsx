import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function TenantRoutes() {
  const { token, role, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'tenant') return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
