import { Component, lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ProtectedRoute from './ProtectedRoute'
import AuthPage from '../pages/AuthPage'
import AdminPanel from '../pages/AdminPanel'
import ProfesorPanel from '../pages/ProfesorPanel'

const Informes = lazy(() => import('../pages/Informes'))

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <main className="main">
            <div className="form-container">
              <h2>Error al cargar el módulo</h2>
              <div className="alert error">
                {this.state.error.message || 'Ocurrió un error inesperado. Recarga la página.'}
              </div>
              <button className="btn-primary" onClick={() => window.location.reload()}>
                Recargar página
              </button>
            </div>
          </main>
        </div>
      )
    }
    return this.props.children
  }
}

function RootRedirect() {
  const { user, profile, loadingSession, loadingProfile } = useAuth()

  if (loadingSession || loadingProfile) {
    return (
      <div className="app">
        <div className="loading">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return <Navigate to={profile?.rol === 'admin' ? '/admin' : '/profesor'} replace />
}

const FallbackCargando = () => (
  <div className="app">
    <div className="loading">
      <p>Cargando módulo...</p>
    </div>
  </div>
)

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />

      <Route element={<ProtectedRoute roles={['profesor', 'admin']} />}>
        <Route path="/profesor" element={<ProfesorPanel />} />
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<AdminPanel />} />
        <Route
          path="/admin/informes"
          element={
            <ErrorBoundary>
              <Suspense fallback={<FallbackCargando />}>
                <Informes />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
