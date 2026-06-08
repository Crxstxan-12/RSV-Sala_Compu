import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'
import LiveDateTime from '../components/LiveDateTime'
import ReportCards from '../components/reports/ReportCards'
import ChartsDashboard from '../components/reports/ChartsDashboard'
import ReportsTable from '../components/reports/ReportsTable'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Helpers de fecha local (sin offset UTC) ──────────────────────────────────
const toLocalStr = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const getLunesActual = () => {
  const hoy = new Date()
  const dia = hoy.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() + diff)
  return toLocalStr(lunes)
}

const getDomingoActual = () => {
  const hoy = new Date()
  const dia = hoy.getDay()
  const diff = dia === 0 ? 0 : 7 - dia
  const domingo = new Date(hoy)
  domingo.setDate(hoy.getDate() + diff)
  return toLocalStr(domingo)
}

const getPrimerDiaMes = () => {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
}

const getUltimoDiaMes = () => {
  const hoy = new Date()
  const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  return toLocalStr(ultimo)
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// ── Componente principal ─────────────────────────────────────────────────────
export default function Informes() {
  const { profile, signOut } = useAuth()
  const [logoSrc, setLogoSrc] = useState('/logo-escuela.png')

  const [reservas, setReservas] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [periodo, setPeriodo] = useState('semana')
  const [fechaInicio, setFechaInicio] = useState(getLunesActual())
  const [fechaFin, setFechaFin] = useState(getDomingoActual())

  const handlePeriodo = (p) => {
    setPeriodo(p)
    if (p === 'semana') {
      setFechaInicio(getLunesActual())
      setFechaFin(getDomingoActual())
    } else if (p === 'mes') {
      setFechaInicio(getPrimerDiaMes())
      setFechaFin(getUltimoDiaMes())
    }
  }

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resResult, solResult] = await Promise.all([
        supabase.from('reservas').select('*').order('fecha', { ascending: true }),
        supabase.from('solicitudes_equipos').select('*').order('fecha', { ascending: true }),
      ])
      if (resResult.error) throw resResult.error
      if (solResult.error) throw solResult.error
      setReservas(resResult.data || [])
      setSolicitudes(solResult.data || [])
    } catch (e) {
      setError(e.message || 'No se pudieron cargar los datos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
    const onVisible = () => {
      if (document.visibilityState === 'visible') cargarDatos()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [cargarDatos])

  // ── Filtrado por período ────────────────────────────────────────────────────
  const reservasFiltradas = useMemo(() =>
    reservas.filter(r => r.fecha >= fechaInicio && r.fecha <= fechaFin),
    [reservas, fechaInicio, fechaFin]
  )

  const solicitudesFiltradas = useMemo(() =>
    solicitudes.filter(s => s.fecha >= fechaInicio && s.fecha <= fechaFin),
    [solicitudes, fechaInicio, fechaFin]
  )

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = reservasFiltradas.length
    const aprobadas = reservasFiltradas.filter(r => r.estado === 'aprobada').length
    const pendientes = reservasFiltradas.filter(r => r.estado === 'pendiente').length
    const rechazadas = reservasFiltradas.filter(r => r.estado === 'rechazada').length

    const porProfesor = {}
    reservasFiltradas.forEach(r => { porProfesor[r.nombre] = (porProfesor[r.nombre] || 0) + 1 })
    const profesorTop = Object.entries(porProfesor).sort(([, a], [, b]) => b - a)[0]

    const porCurso = {}
    reservasFiltradas.forEach(r => { porCurso[r.curso] = (porCurso[r.curso] || 0) + 1 })
    const cursoTop = Object.entries(porCurso).sort(([, a], [, b]) => b - a)[0]

    const porDia = {}
    reservasFiltradas.forEach(r => {
      const [y, m, d] = r.fecha.split('-')
      const nombre = DIAS_SEMANA[new Date(Number(y), Number(m) - 1, Number(d)).getDay()]
      porDia[nombre] = (porDia[nombre] || 0) + 1
    })
    const diaTop = Object.entries(porDia).sort(([, a], [, b]) => b - a)[0]

    const porHora = {}
    reservasFiltradas.forEach(r => {
      const key = `${r.hora_inicio} – ${r.hora_fin}`
      porHora[key] = (porHora[key] || 0) + 1
    })
    const horarioTop = Object.entries(porHora).sort(([, a], [, b]) => b - a)[0]

    const totalSolicitudes = solicitudesFiltradas.length
    const porRecurso = {}
    solicitudesFiltradas.forEach(s => { porRecurso[s.recurso] = (porRecurso[s.recurso] || 0) + 1 })
    const recursoTop = Object.entries(porRecurso).sort(([, a], [, b]) => b - a)[0]

    return { total, aprobadas, pendientes, rechazadas, profesorTop, cursoTop, diaTop, horarioTop, totalSolicitudes, recursoTop }
  }, [reservasFiltradas, solicitudesFiltradas])

  // ── Datos para gráficos ─────────────────────────────────────────────────────
  const datosPorDia = useMemo(() => {
    const orden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    const conteo = Object.fromEntries(orden.map(d => [d, 0]))
    reservasFiltradas.forEach(r => {
      const [y, m, d] = r.fecha.split('-')
      const nombre = DIAS_SEMANA[new Date(Number(y), Number(m) - 1, Number(d)).getDay()]
      if (conteo[nombre] !== undefined) conteo[nombre]++
    })
    return orden.map(d => ({ dia: d, reservas: conteo[d] }))
  }, [reservasFiltradas])

  const datosEstados = useMemo(() => {
    const etiquetas = { aprobada: 'Aprobadas', pendiente: 'Pendientes', rechazada: 'Rechazadas' }
    return ['aprobada', 'pendiente', 'rechazada']
      .map(e => ({ name: etiquetas[e], value: reservasFiltradas.filter(r => r.estado === e).length }))
      .filter(d => d.value > 0)
  }, [reservasFiltradas])

  const datosPorSemana = useMemo(() => {
    const semanas = {}
    reservasFiltradas.forEach(r => {
      const [y, m, d] = r.fecha.split('-')
      const fecha = new Date(Number(y), Number(m) - 1, Number(d))
      const dia = fecha.getDay()
      const diff = dia === 0 ? -6 : 1 - dia
      const lunes = new Date(fecha)
      lunes.setDate(fecha.getDate() + diff)
      const key = toLocalStr(lunes)
      semanas[key] = (semanas[key] || 0) + 1
    })
    return Object.entries(semanas)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => ({ semana: `Sem. ${key.slice(5).replace('-', '/')}`, total }))
  }, [reservasFiltradas])

  const datosRecursos = useMemo(() => {
    const conteo = {}
    solicitudesFiltradas.forEach(s => { conteo[s.recurso] = (conteo[s.recurso] || 0) + 1 })
    return Object.entries(conteo).sort(([, a], [, b]) => b - a).map(([recurso, total]) => ({ recurso, total }))
  }, [solicitudesFiltradas])

  // ── Exportar PDF ────────────────────────────────────────────────────────────
  const exportarPDF = () => {
    const doc = new jsPDF()
    const ahora = new Date()
    const fechaGen = ahora.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
    const horaGen = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

    // Encabezado
    doc.setFillColor(102, 126, 234)
    doc.rect(0, 0, 210, 34, 'F')
    doc.setTextColor(255)
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.text('Escuela Particular Chillán Viejo', 14, 13)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Informe de Uso — Sala de Computación', 14, 20)
    doc.setFontSize(8)
    doc.text(`Período: ${fechaInicio} al ${fechaFin}   |   Generado: ${fechaGen} ${horaGen}`, 14, 28)
    doc.setTextColor(0)

    // Resumen ejecutivo
    let y = 44
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen ejecutivo', 14, y)
    y += 2
    doc.setDrawColor(102, 126, 234)
    doc.setLineWidth(0.5)
    doc.line(14, y, 100, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lineas = [
      [`Total de reservas:`, `${stats.total}`],
      [`Aprobadas:`, `${stats.aprobadas}`],
      [`Pendientes:`, `${stats.pendientes}`],
      [`Rechazadas:`, `${stats.rechazadas}`],
      [`Total solicitudes de equipos:`, `${stats.totalSolicitudes}`],
      stats.profesorTop ? [`Profesor con más reservas:`, `${stats.profesorTop[0]} (${stats.profesorTop[1]} reservas)`] : null,
      stats.cursoTop ? [`Curso con mayor uso:`, `${stats.cursoTop[0]} (${stats.cursoTop[1]} reservas)`] : null,
      stats.diaTop ? [`Día más solicitado:`, `${stats.diaTop[0]} (${stats.diaTop[1]} reservas)`] : null,
      stats.recursoTop ? [`Equipo más solicitado:`, `${stats.recursoTop[0]} (${stats.recursoTop[1]} solicitudes)`] : null,
    ].filter(Boolean)

    lineas.forEach(([etiqueta, valor]) => {
      doc.setFont('helvetica', 'bold')
      doc.text(etiqueta, 14, y)
      doc.setFont('helvetica', 'normal')
      doc.text(valor, 80, y)
      y += 6
    })

    y += 4

    // Tabla de reservas
    if (reservasFiltradas.length > 0) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Detalle de reservas (${reservasFiltradas.length})`, 14, y)
      y += 2

      autoTable(doc, {
        startY: y + 2,
        head: [['Profesor', 'Curso', 'Fecha', 'Horario', 'Motivo', 'Estado']],
        body: reservasFiltradas.map(r => [
          r.nombre || '',
          r.curso || '',
          r.fecha || '',
          `${r.hora_inicio} - ${r.hora_fin}`,
          (r.motivo || '').slice(0, 50),
          (r.estado || '').toUpperCase(),
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        columnStyles: { 4: { cellWidth: 45 } },
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 12
    }

    // Tabla de solicitudes
    if (solicitudesFiltradas.length > 0) {
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Solicitudes de equipos (${solicitudesFiltradas.length})`, 14, y)
      y += 2

      autoTable(doc, {
        startY: y + 2,
        head: [['Profesor', 'Curso', 'Fecha', 'Horario', 'Recurso', 'Estado']],
        body: solicitudesFiltradas.map(s => [
          s.nombre || '',
          s.curso || '',
          s.fecha || '',
          `${s.hora_inicio} - ${s.hora_fin}`,
          s.recurso || '',
          (s.estado || '').toUpperCase(),
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        margin: { left: 14, right: 14 },
      })
    }

    // Pie de página
    const totalPaginas = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text(
        `Página ${i} de ${totalPaginas}  —  Sistema de Gestión de Reservas · Escuela Particular Chillán Viejo`,
        14,
        doc.internal.pageSize.height - 8
      )
    }

    doc.save(`informe-${fechaInicio}-al-${fechaFin}.pdf`)
  }

  const sinDatos = reservasFiltradas.length === 0 && solicitudesFiltradas.length === 0

  // ── UI ──────────────────────────────────────────────────────────────────────
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
              <div className="brand-title">Informes y Estadísticas</div>
              <div className="brand-subtitle">Sala de Computación · Escuela Particular Chillán Viejo</div>
            </div>
            <LiveDateTime />
          </div>
          <div className="header-user">
            <span className="user-info">
              {profile?.nombre || profile?.email || ''} (Encargado)
            </span>
            <button onClick={signOut} className="btn-small btn-logout">Cerrar Sesión</button>
          </div>
        </div>
      </header>

      <nav className="nav">
        <Link className="nav-btn" to="/admin">Panel Admin</Link>
        <button className="nav-btn nav-btn-current" disabled>Informes</button>
      </nav>

      <main className="main">
        {error && <div className="alert error">{error}</div>}

        {/* Barra de filtros y acciones */}
        <div className="report-filter-bar">
          <div className="report-period-tabs">
            {[
              { key: 'semana', label: 'Semana actual' },
              { key: 'mes', label: 'Mes actual' },
              { key: 'personalizado', label: 'Personalizado' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`report-period-btn${periodo === key ? ' active' : ''}`}
                onClick={() => handlePeriodo(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {periodo === 'personalizado' && (
            <div className="report-date-range">
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                max={fechaFin}
              />
              <span className="date-separator">al</span>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                min={fechaInicio}
              />
            </div>
          )}

          <div className="report-actions">
            <button onClick={cargarDatos} className="btn-small btn-refresh" disabled={loading}>
              {loading ? 'Cargando...' : '↻ Actualizar'}
            </button>
            <button
              onClick={exportarPDF}
              className="btn-small btn-pdf"
              disabled={loading || sinDatos}
              title={sinDatos ? 'Sin datos en el período seleccionado' : 'Descargar PDF'}
            >
              📄 Exportar PDF
            </button>
            <button onClick={() => window.print()} className="btn-small btn-print">
              🖨 Imprimir
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading"><p>Cargando datos...</p></div>
        ) : (
          <>
            <ReportCards stats={stats} />
            <ChartsDashboard
              datosPorDia={datosPorDia}
              datosEstados={datosEstados}
              datosPorSemana={datosPorSemana}
              datosRecursos={datosRecursos}
            />
            <ReportsTable
              reservas={reservasFiltradas}
              solicitudes={solicitudesFiltradas}
            />
          </>
        )}
      </main>

      <footer className="footer">
        <p>Cristian Cifuentes © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
