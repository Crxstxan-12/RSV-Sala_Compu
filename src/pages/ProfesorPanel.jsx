import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ReservationForm from '../components/ReservationForm'
import ReservationsTable from '../components/ReservationsTable'
import EquipmentRequestForm from '../components/EquipmentRequestForm'
import EquipmentRequestsList from '../components/EquipmentRequestsList'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'

export default function ProfesorPanel() {
  const { user, profile, signOut, error: authError } = useAuth()
  const [logoSrc, setLogoSrc] = useState('/logo-escuela.png')
  const [vista, setVista] = useState('formulario')
  const [reservas, setReservas] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const nombreMostrado = useMemo(() => {
    const nombre = profile?.nombre?.trim()
    return nombre ? nombre : user?.email
  }, [profile?.nombre, user?.email])

  const cargarReservas = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setReservas(data || [])
    } catch (e) {
      if (e?.status === 403) {
        setError('Permisos insuficientes para leer reservas. Verifica RLS/políticas en Supabase.')
      } else {
        setError(e.message || 'No se pudieron cargar las reservas.')
      }
    } finally {
      setLoading(false)
    }
  }

  const cargarSolicitudes = async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('solicitudes_equipos')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setSolicitudes(data || [])
    } catch {
      // non-critical, fail silently
    }
  }

  useEffect(() => {
    cargarReservas()
    cargarSolicitudes()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cargarReservas()
        cargarSolicitudes()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="brand">
            <img
              className="brand-logo"
              src={logoSrc}
              alt="Escuela Particular Chillán Viejo"
              onError={() => setLogoSrc('/favicon.svg')}
            />
            <div className="brand-text">
              <div className="brand-title">Plataforma de Reservas</div>
              <div className="brand-subtitle">Sala de Computación · Escuela Particular Chillán Viejo</div>
            </div>
          </div>
          <div className="header-user">
            <span className="user-info">
              {nombreMostrado} ({profile?.rol === 'admin' ? 'Encargado Sala Computación' : 'Profesor'})
            </span>
            <button onClick={handleLogout} className="btn-small btn-logout">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <nav className="nav">
        <button
          className={vista === 'formulario' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setVista('formulario')}
        >
          Nueva Reserva
        </button>
        <button
          className={vista === 'tabla' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setVista('tabla')}
        >
          Ver Reservas
        </button>
        <button
          className={vista === 'equipo_form' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setVista('equipo_form')}
        >
          Solicitar Equipo
        </button>
        <button
          className={vista === 'equipo_lista' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setVista('equipo_lista')}
        >
          Mis Solicitudes
        </button>
        {profile?.rol === 'admin' && (
          <Link className="nav-btn" to="/admin">
            Administración
          </Link>
        )}
      </nav>

      <main className="main">
        {authError && !profile && <div className="alert error">{authError}</div>}
        {error && <div className="alert error">{error}</div>}

        {loading ? (
          <div className="loading">
            <p>Cargando...</p>
          </div>
        ) : (
          <>
            {vista === 'formulario' && (
              <ReservationForm onReservaAgregada={cargarReservas} />
            )}
            {vista === 'tabla' && (
              <ReservationsTable reservas={reservas} />
            )}
            {vista === 'equipo_form' && (
              <EquipmentRequestForm onSolicitudAgregada={cargarSolicitudes} />
            )}
            {vista === 'equipo_lista' && (
              <EquipmentRequestsList solicitudes={solicitudes} userId={user?.id} />
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p> Cristian Cifuentes © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
