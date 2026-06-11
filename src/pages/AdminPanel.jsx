import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'
import { formatearFecha } from '../utils/fecha'
import LiveDateTime from '../components/LiveDateTime'

const getEstadoBadge = (estado) => {
  const estados = {
    pendiente: 'badge pending',
    aprobada: 'badge approved',
    rechazada: 'badge rejected',
    entregada: 'badge delivered',
    devuelta: 'badge returned',
  }
  return <span className={estados[estado] || 'badge pending'}>{estado.toUpperCase()}</span>
}

export default function AdminPanel() {
  const { user, profile, signOut } = useAuth()
  const [logoSrc, setLogoSrc] = useState('/logo-escuela.png')

  const [reservas, setReservas] = useState([])
  const [profesores, setProfesores] = useState([])
  const [solicitudes, setSolicitudes] = useState([])

  const [loadingReservas, setLoadingReservas] = useState(true)
  const [loadingProfesores, setLoadingProfesores] = useState(true)
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true)
  const [loadingAccion, setLoadingAccion] = useState({})

  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteSolicitud, setConfirmDeleteSolicitud] = useState(null)

  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroRecurso, setFiltroRecurso] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')

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

  const cargarSolicitudes = async () => {
    setLoadingSolicitudes(true)
    try {
      const { data, error } = await supabase
        .from('solicitudes_equipos')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setSolicitudes(data || [])
    } catch (e) {
      if (e?.status === 403) {
        setError('Permisos insuficientes para leer solicitudes. Verifica RLS/políticas en Supabase.')
      } else {
        setError(e.message || 'No se pudieron cargar las solicitudes.')
      }
    } finally {
      setLoadingSolicitudes(false)
    }
  }

  useEffect(() => {
    cargarReservas()
    cargarProfesores()
    cargarSolicitudes()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cargarReservas()
        cargarProfesores()
        cargarSolicitudes()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
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

  const eliminarReserva = async () => {
    const id = confirmDelete
    const reservaId = typeof id === 'bigint' ? id.toString() : String(id)

    setConfirmDelete(null)
    setLoadingAccion(prev => ({ ...prev, [`delete-${reservaId}`]: true }))
    limpiarMensajes()

    try {
      const { error: deleteError, count } = await supabase
        .from('reservas')
        .delete({ count: 'exact' })
        .eq('id', reservaId)

      if (deleteError) throw deleteError

      if (count === 0) {
        const { data: existe, error: checkError } = await supabase
          .from('reservas')
          .select('id')
          .eq('id', reservaId)
          .maybeSingle()

        if (checkError) throw checkError
        if (existe) {
          throw new Error('No se pudo eliminar la reserva. Verifica que tu usuario tenga rol admin y que la policy DELETE permita borrar registros.')
        }
      }

      setSuccess('Reserva eliminada exitosamente.')
      await cargarReservas()
    } catch (e) {
      if (e?.status === 403) {
        setError('Permisos insuficientes para eliminar reservas. Revisa la policy DELETE y que tu usuario sea admin.')
      } else {
        setError(e?.message || 'No se pudo eliminar la reserva.')
      }
    } finally {
      setLoadingAccion(prev => ({ ...prev, [`delete-${reservaId}`]: false }))
    }
  }

  const actualizarEstadoSolicitud = async (id, nuevoEstado) => {
    const key = `sol-${id}`
    setLoadingAccion(prev => ({ ...prev, [key]: true }))
    limpiarMensajes()
    try {
      const { error } = await supabase
        .from('solicitudes_equipos')
        .update({ estado: nuevoEstado })
        .eq('id', id)
      if (error) throw error
      setSuccess(`Solicitud marcada como ${nuevoEstado}.`)
      await cargarSolicitudes()
    } catch (e) {
      setError(e.message || 'No se pudo actualizar la solicitud.')
    } finally {
      setLoadingAccion(prev => ({ ...prev, [key]: false }))
    }
  }

  const eliminarSolicitud = async () => {
    const id = confirmDeleteSolicitud
    const solicitudId = String(id)

    setConfirmDeleteSolicitud(null)
    setLoadingAccion(prev => ({ ...prev, [`del-sol-${solicitudId}`]: true }))
    limpiarMensajes()

    try {
      const { error: deleteError } = await supabase
        .from('solicitudes_equipos')
        .delete()
        .eq('id', solicitudId)

      if (deleteError) throw deleteError
      setSuccess('Solicitud eliminada exitosamente.')
      await cargarSolicitudes()
    } catch (e) {
      if (e?.status === 403) {
        setError('Permisos insuficientes para eliminar la solicitud.')
      } else {
        setError(e?.message || 'No se pudo eliminar la solicitud.')
      }
    } finally {
      setLoadingAccion(prev => ({ ...prev, [`del-sol-${solicitudId}`]: false }))
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  const reservasOrdenadas = useMemo(() => {
    return [...reservas].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
      return a.hora_inicio.localeCompare(b.hora_inicio)
    })
  }, [reservas])

  const recursosDisponibles = useMemo(() =>
    [...new Set(solicitudes.map(s => s.recurso))].sort(),
    [solicitudes]
  )

  const solicitudesFiltradas = useMemo(() => {
    return [...solicitudes]
      .filter(s => {
        if (filtroNombre && !s.nombre.toLowerCase().includes(filtroNombre.toLowerCase())) return false
        if (filtroRecurso && s.recurso !== filtroRecurso) return false
        if (filtroFecha && s.fecha !== filtroFecha) return false
        return true
      })
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
        return a.hora_inicio.localeCompare(b.hora_inicio)
      })
  }, [solicitudes, filtroNombre, filtroRecurso, filtroFecha])

  const statsEquipos = useMemo(() => {
    const total = solicitudes.length
    const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length

    const conteoPorRecurso = {}
    solicitudes.forEach(s => {
      conteoPorRecurso[s.recurso] = (conteoPorRecurso[s.recurso] || 0) + 1
    })
    const recursoTop = Object.entries(conteoPorRecurso).sort(([, a], [, b]) => b - a)[0]

    const conteoPorNombre = {}
    solicitudes.forEach(s => {
      conteoPorNombre[s.nombre] = (conteoPorNombre[s.nombre] || 0) + 1
    })
    const usuarioTop = Object.entries(conteoPorNombre).sort(([, a], [, b]) => b - a)[0]

    return { total, pendientes, recursoTop, usuarioTop }
  }, [solicitudes])

  return (
    <div className="app">
      {confirmDelete !== null && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Eliminar reserva</h3>
            <p>¿Estás seguro de que deseas eliminar esta reserva? Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button onClick={() => setConfirmDelete(null)} className="btn-small btn-cancel">
                Cancelar
              </button>
              <button onClick={eliminarReserva} className="btn-small btn-delete">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteSolicitud !== null && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteSolicitud(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Eliminar solicitud</h3>
            <p>¿Estás seguro de que deseas eliminar esta solicitud? Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button onClick={() => setConfirmDeleteSolicitud(null)} className="btn-small btn-cancel">
                Cancelar
              </button>
              <button onClick={eliminarSolicitud} className="btn-small btn-delete">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

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
            <LiveDateTime />
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
        <Link className="nav-btn" to="/admin/informes">
          Informes
        </Link>
        <button className="nav-btn" onClick={() => { limpiarMensajes(); cargarReservas(); cargarProfesores(); cargarSolicitudes(); }}>
          Actualizar
        </button>
      </nav>

      <main className="main">
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        {/* Reservas */}
        <div className="admin-panel">
          <h2>Reservas</h2>

          {loadingReservas ? (
            <div className="loading">
              <p>Cargando reservas...</p>
            </div>
          ) : reservasOrdenadas.length === 0 ? (
            <p className="no-reservas">No hay reservas para administrar.</p>
          ) : (
            <>
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
                            onClick={() => setConfirmDelete(reserva.id)}
                            disabled={!!loadingAccion[`delete-${reserva.id}`]}
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

              <div className="reserva-cards">
                {reservasOrdenadas.map((reserva) => (
                  <div key={reserva.id} className="reserva-card">
                    <div className="card-row"><span className="card-label">Profesor:</span> {reserva.nombre}</div>
                    <div className="card-row"><span className="card-label">Curso:</span> {reserva.curso}</div>
                    <div className="card-row"><span className="card-label">Fecha:</span> {formatearFecha(reserva.fecha)}</div>
                    <div className="card-row"><span className="card-label">Horario:</span> {reserva.hora_inicio} - {reserva.hora_fin}</div>
                    <div className="card-row"><span className="card-label">Motivo:</span> {reserva.motivo}</div>
                    <div className="card-row"><span className="card-label">Estado:</span> {getEstadoBadge(reserva.estado)}</div>
                    <div className="card-actions">
                      {reserva.estado !== 'aprobada' && (
                        <button
                          onClick={() => actualizarEstado(reserva.id, 'aprobada')}
                          disabled={!!loadingAccion[reserva.id]}
                          className="btn-small btn-approve"
                        >
                          {loadingAccion[reserva.id] ? '...' : 'Aprobar'}
                        </button>
                      )}
                      {reserva.estado !== 'rechazada' && (
                        <button
                          onClick={() => actualizarEstado(reserva.id, 'rechazada')}
                          disabled={!!loadingAccion[reserva.id]}
                          className="btn-small btn-reject"
                        >
                          {loadingAccion[reserva.id] ? '...' : 'Rechazar'}
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(reserva.id)}
                        disabled={!!loadingAccion[`delete-${reserva.id}`]}
                        className="btn-small btn-delete"
                      >
                        {loadingAccion[`delete-${reserva.id}`] ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Solicitudes de Equipos */}
        <div className="admin-panel">
          <h2>Solicitudes de Recursos Tecnológicos</h2>

          {solicitudes.length > 0 && (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{statsEquipos.total}</span>
                <span className="stat-label">Total solicitudes</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{statsEquipos.pendientes}</span>
                <span className="stat-label">Pendientes</span>
              </div>
              <div className="stat-card">
                <span className="stat-value stat-value-sm">{statsEquipos.recursoTop ? statsEquipos.recursoTop[0] : '—'}</span>
                <span className="stat-label">Recurso más solicitado</span>
              </div>
              <div className="stat-card">
                <span className="stat-value stat-value-sm">{statsEquipos.usuarioTop ? statsEquipos.usuarioTop[0] : '—'}</span>
                <span className="stat-label">Profesor más activo</span>
              </div>
            </div>
          )}

          <div className="filter-bar">
            <div className="form-group">
              <label>Buscar por nombre:</label>
              <input
                type="text"
                value={filtroNombre}
                onChange={e => setFiltroNombre(e.target.value)}
                placeholder="Nombre del profesor..."
              />
            </div>
            <div className="form-group">
              <label>Recurso:</label>
              <select
                value={filtroRecurso}
                onChange={e => setFiltroRecurso(e.target.value)}
                className="form-select"
              >
                <option value="">Todos</option>
                {recursosDisponibles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha:</label>
              <input
                type="date"
                value={filtroFecha}
                onChange={e => setFiltroFecha(e.target.value)}
              />
            </div>
            {(filtroNombre || filtroRecurso || filtroFecha) && (
              <button
                className="btn-small btn-cancel"
                onClick={() => { setFiltroNombre(''); setFiltroRecurso(''); setFiltroFecha('') }}
              >
                Limpiar
              </button>
            )}
          </div>

          {loadingSolicitudes ? (
            <div className="loading">
              <p>Cargando solicitudes...</p>
            </div>
          ) : solicitudesFiltradas.length === 0 ? (
            <p className="no-reservas">
              {solicitudes.length === 0
                ? 'No hay solicitudes de equipos.'
                : 'No hay solicitudes que coincidan con los filtros.'}
            </p>
          ) : (
            <>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Profesor</th>
                      <th>Curso</th>
                      <th>Recurso</th>
                      <th>Cant.</th>
                      <th>Fecha</th>
                      <th>Horario</th>
                      <th>Motivo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudesFiltradas.map((s) => (
                      <tr key={s.id}>
                        <td>{s.nombre}</td>
                        <td>{s.curso}</td>
                        <td>{s.recurso}</td>
                        <td>{s.cantidad}</td>
                        <td>{formatearFecha(s.fecha)}</td>
                        <td>{s.hora_inicio} - {s.hora_fin}</td>
                        <td>{s.motivo}</td>
                        <td>{getEstadoBadge(s.estado)}</td>
                        <td className="actions-cell">
                          {s.estado === 'pendiente' && (
                            <button
                              onClick={() => actualizarEstadoSolicitud(s.id, 'aprobada')}
                              disabled={!!loadingAccion[`sol-${s.id}`]}
                              className="btn-small btn-approve"
                            >
                              {loadingAccion[`sol-${s.id}`] ? '...' : 'Aprobar'}
                            </button>
                          )}
                          {(s.estado === 'pendiente' || s.estado === 'aprobada') && (
                            <button
                              onClick={() => actualizarEstadoSolicitud(s.id, 'rechazada')}
                              disabled={!!loadingAccion[`sol-${s.id}`]}
                              className="btn-small btn-reject"
                            >
                              {loadingAccion[`sol-${s.id}`] ? '...' : 'Rechazar'}
                            </button>
                          )}
                          {s.estado === 'aprobada' && (
                            <button
                              onClick={() => actualizarEstadoSolicitud(s.id, 'entregada')}
                              disabled={!!loadingAccion[`sol-${s.id}`]}
                              className="btn-small btn-deliver"
                            >
                              {loadingAccion[`sol-${s.id}`] ? '...' : 'Entregado'}
                            </button>
                          )}
                          {s.estado === 'entregada' && (
                            <button
                              onClick={() => actualizarEstadoSolicitud(s.id, 'devuelta')}
                              disabled={!!loadingAccion[`sol-${s.id}`]}
                              className="btn-small btn-return"
                            >
                              {loadingAccion[`sol-${s.id}`] ? '...' : 'Devuelto'}
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDeleteSolicitud(s.id)}
                            disabled={!!loadingAccion[`del-sol-${s.id}`]}
                            className="btn-small btn-delete"
                          >
                            {loadingAccion[`del-sol-${s.id}`] ? '...' : 'Eliminar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="solicitud-cards">
                {solicitudesFiltradas.map((s) => (
                  <div key={s.id} className="reserva-card">
                    <div className="card-row"><span className="card-label">Profesor:</span> {s.nombre}</div>
                    <div className="card-row"><span className="card-label">Curso:</span> {s.curso}</div>
                    <div className="card-row"><span className="card-label">Recurso:</span> {s.recurso} (x{s.cantidad})</div>
                    <div className="card-row"><span className="card-label">Fecha:</span> {formatearFecha(s.fecha)}</div>
                    <div className="card-row"><span className="card-label">Horario:</span> {s.hora_inicio} - {s.hora_fin}</div>
                    <div className="card-row"><span className="card-label">Motivo:</span> {s.motivo}</div>
                    {s.observaciones && (
                      <div className="card-row"><span className="card-label">Obs.:</span> {s.observaciones}</div>
                    )}
                    <div className="card-row"><span className="card-label">Estado:</span> {getEstadoBadge(s.estado)}</div>
                    <div className="card-actions">
                      {s.estado === 'pendiente' && (
                        <button
                          onClick={() => actualizarEstadoSolicitud(s.id, 'aprobada')}
                          disabled={!!loadingAccion[`sol-${s.id}`]}
                          className="btn-small btn-approve"
                        >
                          {loadingAccion[`sol-${s.id}`] ? '...' : 'Aprobar'}
                        </button>
                      )}
                      {(s.estado === 'pendiente' || s.estado === 'aprobada') && (
                        <button
                          onClick={() => actualizarEstadoSolicitud(s.id, 'rechazada')}
                          disabled={!!loadingAccion[`sol-${s.id}`]}
                          className="btn-small btn-reject"
                        >
                          {loadingAccion[`sol-${s.id}`] ? '...' : 'Rechazar'}
                        </button>
                      )}
                      {s.estado === 'aprobada' && (
                        <button
                          onClick={() => actualizarEstadoSolicitud(s.id, 'entregada')}
                          disabled={!!loadingAccion[`sol-${s.id}`]}
                          className="btn-small btn-deliver"
                        >
                          {loadingAccion[`sol-${s.id}`] ? '...' : 'Entregado'}
                        </button>
                      )}
                      {s.estado === 'entregada' && (
                        <button
                          onClick={() => actualizarEstadoSolicitud(s.id, 'devuelta')}
                          disabled={!!loadingAccion[`sol-${s.id}`]}
                          className="btn-small btn-return"
                        >
                          {loadingAccion[`sol-${s.id}`] ? '...' : 'Devuelto'}
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDeleteSolicitud(s.id)}
                        disabled={!!loadingAccion[`del-sol-${s.id}`]}
                        className="btn-small btn-delete"
                      >
                        {loadingAccion[`del-sol-${s.id}`] ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Profesores Registrados */}
        <div className="admin-panel">
          <h2>Profesores Registrados</h2>

          {loadingProfesores ? (
            <div className="loading">
              <p>Cargando profesores...</p>
            </div>
          ) : profesores.length === 0 ? (
            <p className="no-reservas">No hay profesores registrados.</p>
          ) : (
            <div className="table-wrapper">
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
        <p>Cristian Cifuentes 2026  © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
