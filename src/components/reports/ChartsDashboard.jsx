import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'

const COLORES_PIE = ['#22c55e', '#f59e0b', '#ef4444']

const TooltipReservas = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-value">
        {payload[0].value} reservas
      </p>
    </div>
  )
}

const TooltipSemana = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-value">
        {payload[0].value} reservas
      </p>
    </div>
  )
}

export default function ChartsDashboard({
  datosPorDia,
  datosEstados,
  datosPorSemana,
  datosRecursos,
}) {
  return (
    <div className="charts-grid">

      {/* Reservas por día */}
      <div className="chart-card">
        <h3>Reservas por día de la semana</h3>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={datosPorDia}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

            <XAxis
              dataKey="dia"
              tick={{ fontSize: 10 }}
              tickFormatter={(d) => d.slice(0, 3)}
            />

            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
            />

            <Tooltip content={(props) => <TooltipReservas {...props} />} />

            <Bar
              dataKey="reservas"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Estado reservas */}
      <div className="chart-card">
        <h3>Estado de reservas</h3>

        {datosEstados.length === 0 ? (
          <p className="chart-empty">
            Sin datos en el período seleccionado
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={datosEstados}
                cx="50%"
                cy="45%"
                outerRadius={72}
                dataKey="value"
                label={({ percent }) =>
                  `${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {datosEstados.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORES_PIE[i % COLORES_PIE.length]}
                  />
                ))}
              </Pie>

              <Tooltip />

              <Legend
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Uso semanal */}
      <div className="chart-card">
        <h3>Uso de sala por semana</h3>

        {datosPorSemana.length === 0 ? (
          <p className="chart-empty">
            Sin datos en el período seleccionado
          </p>
        ) : datosPorSemana.length === 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={datosPorSemana}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

              <XAxis
                dataKey="semana"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
              />

              <Tooltip content={(props) => <TooltipSemana {...props} />} />

              <Bar
                dataKey="total"
                fill="#7c3aed"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={datosPorSemana}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

              <XAxis
                dataKey="semana"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
              />

              <Tooltip content={(props) => <TooltipSemana {...props} />} />

              <Line
                type="monotone"
                dataKey="total"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={{
                  r: 5,
                  fill: '#7c3aed',
                  strokeWidth: 0,
                }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recursos */}
      <div className="chart-card">
        <h3>Equipos más solicitados</h3>

        {datosRecursos.length === 0 ? (
          <p className="chart-empty">
            Sin solicitudes en el período seleccionado
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={datosRecursos}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

              <XAxis
                dataKey="recurso"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
              />

              <Tooltip />

              <Bar
                dataKey="total"
                fill="#059669"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}