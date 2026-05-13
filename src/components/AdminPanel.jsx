import { useState } from 'react'
import { supabase } from '../supabaseClient'

function AdminPanel({ reservas, onActualizarReservas }) {
  const [loading, setLoading] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const actualizarEstado = async (id, nuevoEstado) => {
    setLoading(prev => ({ ...prev, [id]: true }))
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase
        .from('reservas')
        .update({ estado: nuevoEstado })
        .eq('id', id)

      if (updateError) throw updateError

      setSuccess(`Reserva ${nuevoEstado} exitosamente!`)
      onActualizarReservas()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const eliminarReserva = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta reserva?')) {
      return
    }

    setLoading(prev => ({ ...prev, [`delete-${id}`]: true }))
    setError('')
    setSuccess('')

    try {
      const { error: deleteError } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setSuccess('Reserva eliminada exitosamente!')
      onActualizarReservas()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(prev => ({ ...prev, [`delete-${id}`]: false }))
    }
  }

  const reservasOrdenadas = [...reservas].sort((a, b) => {
    if (a.fecha !== b.fecha) {
      return new Date(a.fecha) - new Date(b.fecha)
    }
    return a.hora_inicio.localeCompare(b.hora_inicio)
  })

  return (
    <div className="admin-panel">
      <h2>Panel de Administración</h2>
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {reservasOrdenadas.length === 0 ? (
        <p className="no-reservas">No hay reservas para administrar.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
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
                        disabled={loading[reserva.id]}
                        className="btn-small btn-approve"
                      >
                        {loading[reserva.id] ? '...' : 'Aprobar'}
                      </button>
                    )}
                    {reserva.estado !== 'rechazada' && (
                      <button
                        onClick={() => actualizarEstado(reserva.id, 'rechazada')}
                        disabled={loading[reserva.id]}
                        className="btn-small btn-reject"
                      >
                        {loading[reserva.id] ? '...' : 'Rechazar'}
                      </button>
                    )}
                    <button
                      onClick={() => eliminarReserva(reserva.id)}
                      disabled={loading[`delete-${reserva.id}`]}
                      className="btn-small btn-delete"
                    >
                      {loading[`delete-${reserva.id}`] ? '...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
