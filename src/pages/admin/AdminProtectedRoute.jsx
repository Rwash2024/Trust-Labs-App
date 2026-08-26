import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'

export default function AdminProtectedRoute({ children }) {
  const { session, loading } = useAdminAuth()

  if (loading) return <div className="admin-loading">جاري التحميل...</div>
  if (!session) return <Navigate to="/admin/login" replace />

  return children
}
