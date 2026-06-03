import { formatearFecha } from '../utils/fecha'

function ReservationsTable({ reservas }) {
  const getEstadoBadge = (estado) => {
    const estados = {
      pendiente: 'badge pending',
      aprobada: 'badge approved',
      rechazada: 'badge rejected'
    }
    return <span className={estados[estado]}>{estado.toUpperCase()}</span>
  }

  const reservasOrdenadas = [...reservas].sort((a, b) => {
    if (a.fecha !== b.fecha) {
      return a.fecha.localeCompare(b.fecha)
    }
    return a.hora_inicio.localeCompare(b.hora_inicio)
  })

  return (
    <div className="table-container">
      <h2>Reservas Realizadas</h2>
      
      {reservasOrdenadas.length === 0 ? (
        <p className="no-reservas">No hay reservas registradas.</p>
      ) : (
        <div className="table-wrapper">
          <table className="reservas-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Curso</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Motivo</th>
                <th>Estado</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ReservationsTable
