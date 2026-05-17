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

function ErrorScreen({ mensaje, onSalir }) {
  return (
    <div className="app">
      <main className="main">
        <div className="form-container">
          <h2>Acceso bloqueado</h2>
          <div className="alert error">{mensaje}</div>
          <button className="btn-primary" onClick={onSalir}>
            Volver a iniciar sesión
          </button>
        </div>
      </main>
    </div>
  )
}

export default function ProtectedRoute({ roles }) {
  const { user, profile, loadingSession, loadingProfile, error, signOut } = useAuth()
  const location = useLocation()

  if (loadingSession || loadingProfile) {
    return <LoadingScreen texto="Cargando..." />
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />
  }

  if (!profile) {
    const mensaje = error || 'No se pudo cargar tu perfil. Verifica que la tabla "perfiles" exista, tenga RLS/políticas correctas y que hayas ejecutado el SQL.'
    return <ErrorScreen mensaje={mensaje} onSalir={signOut} />
  }

  const rol = profile?.rol
  if (roles?.length && (!rol || !roles.includes(rol))) {
    const destino = rol === 'admin' ? '/admin' : '/profesor'
    return <Navigate to={destino} replace />
  }

  return <Outlet />
}
