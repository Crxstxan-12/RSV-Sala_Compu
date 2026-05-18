import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'

const formatearFecha = (fecha) => {
  const date = new Date(fecha)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getEstadoBadge = (estado) => {
  const estados = {
    pendiente: 'badge pending',
    aprobada: 'badge approved',
    rechazada: 'badge rejected'
  }
  return <span className={estados[estado]}>{estado.toUpperCase()}</span>
}

export default function AdminPanel() {
  const { user, profile, signOut } = useAuth()
  const [logoSrc, setLogoSrc] = useState(import.meta.env.VITE_BRAND_LOGO_URL || '/logo-escuela.png')

  const [reservas, setReservas] = useState([])
  const [profesores, setProfesores] = useState([])

  const [loadingReservas, setLoadingReservas] = useState(true)
  const [loadingProfesores, setLoadingProfesores] = useState(true)
  const [loadingAccion, setLoadingAccion] = useState({})

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const nombreMostrado = useMemo(() => {
    const nombre = profile?.nombre?.trim()
    return nombre ? nombre : user?.email
  }, [profile?.nombre, user?.email])

  const cargarReservas = async () => {
    setLoadingReservas(true)
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
      setLoadingReservas(false)
    }
  }

  const cargarProfesores = async () => {
    setLoadingProfesores(true)
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id,nombre,email,rol')
        .eq('rol', 'profesor')
        .order('nombre', { ascending: true })
      if (error) throw error
      setProfesores(data || [])
    } catch (e) {
      if (e?.status === 403) {
        setError('Permisos insuficientes para leer perfiles. Verifica RLS/políticas en Supabase.')
      } else {
        setError(e.message || 'No se pudieron cargar los profesores.')
      }
    } finally {
      setLoadingProfesores(false)
    }
  }

  useEffect(() => {
    cargarReservas()
    cargarProfesores()
  }, [])

  const limpiarMensajes = () => {
    setError('')
    setSuccess('')
  }

  const actualizarEstado = async (id, nuevoEstado) => {
    setLoadingAccion(prev => ({ ...prev, [id]: true }))
    limpiarMensajes()
    try {
      const { error } = await supabase
        .from('reservas')
        .update({ estado: nuevoEstado })
        .eq('id', id)
      if (error) throw error
      setSuccess(`Reserva ${nuevoEstado} exitosamente.`)
      await cargarReservas()
    } catch (e) {
      setError(e.message || 'No se pudo actualizar la reserva.')
    } finally {
      setLoadingAccion(prev => ({ ...prev, [id]: false }))
    }
  }

  const eliminarReserva = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta reserva?')) return

    setLoadingAccion(prev => ({ ...prev, [`delete-${id}`]: true }))
    limpiarMensajes()
    try {
      const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id)
      if (error) throw error
      setSuccess('Reserva eliminada exitosamente.')
      await cargarReservas()
    } catch (e) {
      setError(e.message || 'No se pudo eliminar la reserva.')
    } finally {
      setLoadingAccion(prev => ({ ...prev, [`delete-${id}`]: false }))
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  const reservasOrdenadas = useMemo(() => {
    return [...reservas].sort((a, b) => {
      if (a.fecha !== b.fecha) return new Date(a.fecha) - new Date(b.fecha)
      return a.hora_inicio.localeCompare(b.hora_inicio)
    })
  }, [reservas])

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
              {nombreMostrado} (Encargado Sala Computación)
            </span>
            <button onClick={handleLogout} className="btn-small btn-logout">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <nav className="nav">
        <Link className="nav-btn" to="/profesor">
          Reservas
        </Link>
        <button className="nav-btn" onClick={() => { limpiarMensajes(); cargarReservas(); cargarProfesores(); }}>
          Actualizar
        </button>
      </nav>

      <main className="main">
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <div className="admin-panel">
          <h2>Reservas</h2>

          {loadingReservas ? (
            <div className="loading">
              <p>Cargando reservas...</p>
            </div>
          ) : reservasOrdenadas.length === 0 ? (
            <p className="no-reservas">No hay reservas para administrar.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Profesor</th>
                    <th>Curso</th>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservasOrdenadas.map((reserva) => (
                    <tr key={reserva.id}>
                      <td>{reserva.nombre}</td>
                      <td>{reserva.curso}</td>
                      <td>{formatearFecha(reserva.fecha)}</td>
                      <td>{reserva.hora_inicio} - {reserva.hora_fin}</td>
                      <td>{reserva.motivo}</td>
                      <td>{getEstadoBadge(reserva.estado)}</td>
                      <td className="actions-cell">
                        {reserva.estado !== 'aprobada' && (
                          <button
                            onClick={() => actualizarEstado(reserva.id, 'aprobada')}
                            disabled={loadingAccion[reserva.id]}
                            className="btn-small btn-approve"
                          >
                            {loadingAccion[reserva.id] ? '...' : 'Aprobar'}
                          </button>
                        )}
                        {reserva.estado !== 'rechazada' && (
                          <button
                            onClick={() => actualizarEstado(reserva.id, 'rechazada')}
                            disabled={loadingAccion[reserva.id]}
                            className="btn-small btn-reject"
                          >
                            {loadingAccion[reserva.id] ? '...' : 'Rechazar'}
                          </button>
                        )}
                        <button
                          onClick={() => eliminarReserva(reserva.id)}
                          disabled={loadingAccion[`delete-${reserva.id}`]}
                          className="btn-small btn-delete"
                        >
                          {loadingAccion[`delete-${reserva.id}`] ? '...' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-panel">
          <h2>Profesores Registrados</h2>

          {loadingProfesores ? (
            <div className="loading">
              <p>Cargando profesores...</p>
            </div>
          ) : profesores.length === 0 ? (
            <p className="no-reservas">No hay profesores registrados.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                  </tr>
                </thead>
                <tbody>
                  {profesores.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nombre || p.email}</td>
                      <td>{p.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Plataforma de Reservas © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
