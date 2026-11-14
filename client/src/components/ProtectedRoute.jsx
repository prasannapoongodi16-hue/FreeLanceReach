import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Checking your session…</div>
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}
