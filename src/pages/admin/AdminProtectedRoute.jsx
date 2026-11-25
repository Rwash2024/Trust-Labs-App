import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'

export default function AdminProtectedRoute({ children, requireAdmin = false }) {
  const { session, loading, role, isAdmin } = useAdminAuth()

  if (loading) return <div className="admin-loading">جاري التحميل...</div>
  if (!session) return <Navigate to="/admin/login" replace />
  if (role === 'chemist') return <Navigate to="/chemist" replace />
  if (requireAdmin && !isAdmin) return <Navigate to="/admin/samples" replace />

  return children
}
