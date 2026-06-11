export default function ReportCards({ stats }) {
  const cardsNumericas = [
    { label: 'Total Reservas', valor: stats.total, icono: '📅', color: 'kpi-blue' },
    { label: 'Aprobadas', valor: stats.aprobadas, icono: '✅', color: 'kpi-green' },
    { label: 'Pendientes', valor: stats.pendientes, icono: '⏳', color: 'kpi-yellow' },
    { label: 'Rechazadas', valor: stats.rechazadas, icono: '❌', color: 'kpi-red' },
  ]

  const cardsTexto = [
    {
      label: 'Profesor con más reservas',
      valor: stats.profesorTop ? `${stats.profesorTop[0]} (${stats.profesorTop[1]} reservas)` : '—',
      icono: '👨‍🏫',
      color: 'kpi-purple',
    },
    {
      label: 'Curso con mayor uso',
      valor: stats.cursoTop ? `${stats.cursoTop[0]} (${stats.cursoTop[1]} reservas)` : '—',
      icono: '🏫',
      color: 'kpi-indigo',
    },
    {
      label: 'Día más solicitado',
      valor: stats.diaTop ? `${stats.diaTop[0]} (${stats.diaTop[1]} reservas)` : '—',
      icono: '📆',
      color: 'kpi-teal',
    },
    {
      label: 'Horario más utilizado',
      valor: stats.horarioTop ? `${stats.horarioTop[0]} (${stats.horarioTop[1]}x)` : '—',
      icono: '🕐',
      color: 'kpi-pink',
    },
    {
      label: 'Equipo más solicitado',
      valor: stats.recursoTop ? `${stats.recursoTop[0]} (${stats.recursoTop[1]} veces)` : '—',
      icono: '🖥',
      color: 'kpi-orange',
    },
  ]

  return (
    <div className="kpi-section">
      <div className="report-cards-grid report-cards-grid-4">
        {cardsNumericas.map(c => (
          <div key={c.label} className={`kpi-card ${c.color}`}>
            <div className="kpi-icon">{c.icono}</div>
            <div className="kpi-value">{c.valor}</div>
            <div className="kpi-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="report-cards-grid report-cards-grid-5">
        {cardsTexto.map(c => (
          <div key={c.label} className={`kpi-card ${c.color}`}>
            <div className="kpi-icon">{c.icono}</div>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value-sm">{c.valor}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
