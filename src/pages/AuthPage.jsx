import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const { user, profile, loadingSession, loadingProfile, error, setError, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [modo, setModo] = useState('login')
  const [logoSrc, setLogoSrc] = useState('/logo-escuela.png')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setError('')
    setSuccess('')
  }, [modo, setError])

  if (!loadingSession && !loadingProfile && user) {
    return <Navigate to={profile?.rol === 'admin' ? '/admin' : '/profesor'} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSuccess('')

    try {
      if (modo === 'login') {
        await signIn({ email, password })
        const destino = location.state?.from?.pathname || '/'
        navigate(destino, { replace: true })
      } else {
        await signUp({ email, password, nombre })
        setSuccess('Registro realizado. Si tu proyecto requiere confirmación de correo, revisa tu email antes de iniciar sesión.')
        setModo('login')
      }
    } catch {
      return
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <img
            className="auth-logo"
            src={logoSrc}
            alt="Escuela Particular Chillán Viejo"
            onError={() => setLogoSrc('/favicon.svg')}
          />
        </div>
        <h2>{modo === 'login' ? 'Iniciar Sesión' : 'Registrarse'}</h2>
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {modo === 'registro' && (
            <div className="form-group">
              <label htmlFor="nombre">Nombre completo:</label>
              <input
                type="text"
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Correo electrónico:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-block">
            {loading ? 'Cargando...' : (modo === 'login' ? 'Ingresar' : 'Registrarse')}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button type="button" onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}>
              {modo === 'login' ? 'Registrarse' : 'Iniciar Sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
