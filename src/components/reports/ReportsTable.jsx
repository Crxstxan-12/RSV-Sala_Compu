import { useMemo, useState } from 'react'
import { formatearFecha } from '../../utils/fecha'

const POR_PAGINA = 10

const getBadgeClass = (estado) => {
  const mapa = {
    aprobada: 'approved',
    pendiente: 'pending',
    rechazada: 'rejected',
    entregada: 'delivered',
    devuelta: 'returned',
  }
  return `badge ${mapa[estado] || 'pending'}`
}

export default function ReportsTable({ reservas, solicitudes }) {
  const [tab, setTab] = useState('reservas')
  const [busqueda, setBusqueda] = useState('')
  const [sortKey, setSortKey] = useState('fecha')
  const [sortDir, setSortDir] = useState('asc')
  const [pagina, setPagina] = useState(1)

  const datos = tab === 'reservas' ? reservas : solicitudes

  const getNombre = (r) => tab === 'reservas' ? r.nombre : r.nombre_solicitante
  const getFecha = (r) => tab === 'reservas' ? r.fecha : r.fecha_uso
  const getSortFechaKey = () => tab === 'reservas' ? 'fecha' : 'fecha_uso'
  const getSortNombreKey = () => tab === 'reservas' ? 'nombre' : 'nombre_solicitante'

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return datos

    return datos.filter(r =>
      (r.nombre || r.nombre_solicitante)?.toLowerCase().includes(q) ||
      r.curso?.toLowerCase().includes(q) ||
      r.motivo?.toLowerCase().includes(q) ||
      r.recurso?.toLowerCase().includes(q) ||
      r.estado?.toLowerCase().includes(q)
    )
  }, [datos, busqueda])

  const ordenados = useMemo(() => {
    return [...filtrados].sort((a, b) => {
      const va = String(a[sortKey] ?? '')
      const vb = String(b[sortKey] ?? '')
      const cmp = va.localeCompare(vb)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtrados, sortKey, sortDir])

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA))
  const paginaReal = Math.min(pagina, totalPaginas)
  const filas = ordenados.slice((paginaReal - 1) * POR_PAGINA, paginaReal * POR_PAGINA)

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPagina(1)
  }

  const cambiarTab = (t) => {
    setTab(t)
    setBusqueda('')
    setPagina(1)
    setSortKey(t === 'reservas' ? 'fecha' : 'fecha_uso')
    setSortDir('asc')
  }

  const sortIcon = (key) => {
    if (sortKey !== key) return <span className="sort-icon">⇅</span>
    return <span className="sort-icon sort-active">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  const paginasVisibles = () => {
    const start = Math.max(1, Math.min(paginaReal - 2, totalPaginas - 4))
    const end = Math.min(totalPaginas, start + 4)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  return (
    <div className="report-table-section">
      <div className="report-table-header">
        <h3>Historial detallado</h3>

        <div className="report-table-controls">
          <div className="report-tabs">
            <button
              className={`report-tab${tab === 'reservas' ? ' active' : ''}`}
              onClick={() => cambiarTab('reservas')}
            >
              Reservas <span className="tab-count">{reservas.length}</span>
            </button>

            <button
              className={`report-tab${tab === 'solicitudes' ? ' active' : ''}`}
              onClick={() => cambiarTab('solicitudes')}
            >
              Solicitudes de Equipos <span className="tab-count">{solicitudes.length}</span>
            </button>
          </div>

          <input
            className="report-search"
            type="text"
            placeholder="Buscar por nombre, curso, estado..."
            value={busqueda}
            onChange={e => {
              setBusqueda(e.target.value)
              setPagina(1)
            }}
          />
        </div>
      </div>

      {filas.length === 0 ? (
        <p className="no-reservas">
          {busqueda ? 'Sin resultados para la búsqueda.' : 'No hay datos en el período seleccionado.'}
        </p>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort(getSortNombreKey())}>
                    Profesor {sortIcon(getSortNombreKey())}
                  </th>

                  <th className="sortable" onClick={() => toggleSort('curso')}>
                    Curso {sortIcon('curso')}
                  </th>

                  <th className="sortable" onClick={() => toggleSort(getSortFechaKey())}>
                    Fecha {sortIcon(getSortFechaKey())}
                  </th>

                  <th>Horario</th>

                  {tab === 'reservas' ? <th>Motivo</th> : <th>Recurso</th>}

                  <th className="sortable" onClick={() => toggleSort('estado')}>
                    Estado {sortIcon('estado')}
                  </th>
                </tr>
              </thead>

              <tbody>
                {filas.map(r => (
                  <tr key={`${tab}-${r.id}`}>
                    <td>{getNombre(r)}</td>
                    <td>{r.curso}</td>
                    <td>{formatearFecha(getFecha(r))}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.hora_inicio} – {r.hora_fin}
                    </td>
                    <td>{tab === 'reservas' ? r.motivo : r.recurso}</td>
                    <td>
                      <span className={getBadgeClass(r.estado)}>
                        {r.estado?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-mobile-cards">
            {filas.map(r => (
              <div key={`${tab}-mobile-${r.id}`} className="reserva-card">
                <div className="card-row">
                  <span className="card-label">Profesor</span>
                  <span>{getNombre(r)}</span>
                </div>

                <div className="card-row">
                  <span className="card-label">Curso</span>
                  <span>{r.curso}</span>
                </div>

                <div className="card-row">
                  <span className="card-label">Fecha</span>
                  <span>{formatearFecha(getFecha(r))}</span>
                </div>

                <div className="card-row">
                  <span className="card-label">Horario</span>
                  <span>{r.hora_inicio} – {r.hora_fin}</span>
                </div>

                <div className="card-row">
                  <span className="card-label">
                    {tab === 'reservas' ? 'Motivo' : 'Recurso'}
                  </span>
                  <span>{tab === 'reservas' ? r.motivo : r.recurso}</span>
                </div>

                <div className="card-row">
                  <span className="card-label">Estado</span>
                  <span className={getBadgeClass(r.estado)}>
                    {r.estado?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="report-pagination">
            <span className="pagination-info">
              {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''} — Página {paginaReal} de {totalPaginas}
            </span>

            <div className="pagination-btns">
              <button onClick={() => setPagina(1)} disabled={paginaReal === 1} title="Primera">«</button>
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaReal === 1} title="Anterior">‹</button>

              {paginasVisibles().map(p => (
                <button
                  key={p}
                  onClick={() => setPagina(p)}
                  className={p === paginaReal ? 'active' : ''}
                >
                  {p}
                </button>
              ))}

              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaReal === totalPaginas} title="Siguiente">›</button>
              <button onClick={() => setPagina(totalPaginas)} disabled={paginaReal === totalPaginas} title="Última">»</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}