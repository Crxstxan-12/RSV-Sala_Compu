import { useState } from 'react'
import { supabase } from '../supabaseClient'

function Auth({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [modo, setModo] = useState('login')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    try {
      if (modo === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre,
              rol: 'profesor'
            }
          }
        })
        if (error) throw error
        setError('¡Registro exitoso! Por favor inicia sesión.')
        setModo('login')
      }
    } catch (err) {
      let mensajeError = err.message
      if (mensajeError.includes('Invalid login credentials')) {
        mensajeError = 'Credenciales inválidas. Verifica tu correo y contraseña.'
      } else if (mensajeError.includes('Email not confirmed')) {
        mensajeError = 'Correo electrónico no confirmado. Por favor confirma tu correo.'
      } else if (mensajeError.includes('User already registered')) {
        mensajeError = 'Este correo ya está registrado.'
      } else if (mensajeError.includes('Password should be at least')) {
        mensajeError = 'La contraseña debe tener al menos 6 caracteres.'
      }
      setError(mensajeError)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{modo === 'login' ? 'Iniciar Sesión' : 'Registrarse'}</h2>
        {error && <div className={`alert ${error.includes('exitoso') ? 'success' : 'error'}`}>{error}</div>}

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

          <button type="submit" disabled={cargando} className="btn-primary btn-block">
            {cargando ? 'Cargando...' : (modo === 'login' ? 'Ingresar' : 'Registrarse')}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {modo === 'login' 
              ? '¿No tienes cuenta?' 
              : '¿Ya tienes cuenta?'
            }
            <button onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); }}>
              {modo === 'login' ? 'Registrarse' : 'Iniciar Sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Auth
