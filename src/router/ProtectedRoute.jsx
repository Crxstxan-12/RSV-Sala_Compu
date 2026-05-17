import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function LoadingScreen({ texto }) {
  return (
    <div className="app">
      <div className="loading">
        <p>{texto}</p>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ roles }) {
  const { user, profile, loadingSession, loadingProfile } = useAuth()
  const location = useLocation()

  if (loadingSession || loadingProfile) {
    return <LoadingScreen texto="Cargando..." />
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />
  }

  const rol = profile?.rol
  if (roles?.length && (!rol || !roles.includes(rol))) {
    const destino = rol === 'admin' ? '/admin' : '/profesor'
    return <Navigate to={destino} replace />
  }

  return <Outlet />
}

