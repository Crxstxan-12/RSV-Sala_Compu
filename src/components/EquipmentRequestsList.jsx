import { useMemo } from 'react'

const formatearFecha = (fecha) => {
  const date = new Date(fecha)
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
}

const getEstadoBadge = (estado) => {
  const clases = {
    pendiente: 'badge pending',
    aprobada: 'badge approved',
    rechazada: 'badge rejected',
    entregada: 'badge delivered',
    devuelta: 'badge returned',
  }
  return <span className={clases[estado] || 'badge pending'}>{estado.toUpperCase()}</span>
}

export default function EquipmentRequestsList({ solicitudes, userId }) {
  const misSolicitudes = useMemo(() =>
    [...solicitudes]
      .filter(s => s.usuario_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [solicitudes, userId]
  )

  return (
    <div className="table-container">
      <h2>Mis Solicitudes de Equipos</h2>
      {misSolicitudes.length === 0 ? (
        <p className="no-reservas">No tienes solicitudes registradas.</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="reservas-table">
              <thead>
                <tr>
                  <th>Recurso</th>
                  <th>Cant.</th>
                  <th>Curso</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {misSolicitudes.map(s => (
                  <tr key={s.id}>
                    <td>{s.recurso}</td>
                    <td>{s.cantidad}</td>
                    <td>{s.curso}</td>
                    <td>{formatearFecha(s.fecha)}</td>
                    <td>{s.hora_inicio} - {s.hora_fin}</td>
                    <td>{getEstadoBadge(s.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="solicitud-cards">
            {misSolicitudes.map(s => (
              <div key={s.id} className="reserva-card">
                <div className="card-row"><span className="card-label">Recurso:</span> {s.recurso} (x{s.cantidad})</div>
                <div className="card-row"><span className="card-label">Curso:</span> {s.curso}</div>
                <div className="card-row"><span className="card-label">Fecha:</span> {formatearFecha(s.fecha)}</div>
                <div className="card-row"><span className="card-label">Horario:</span> {s.hora_inicio} - {s.hora_fin}</div>
                <div className="card-row"><span className="card-label">Motivo:</span> {s.motivo}</div>
                {s.observaciones && (
                  <div className="card-row"><span className="card-label">Obs.:</span> {s.observaciones}</div>
                )}
                <div className="card-row"><span className="card-label">Estado:</span> {getEstadoBadge(s.estado)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
