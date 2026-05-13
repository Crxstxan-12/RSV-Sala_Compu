import { useState, useEffect } from 'react'
import './App.css'
import ReservationForm from './components/ReservationForm'
import ReservationsTable from './components/ReservationsTable'
import AdminPanel from './components/AdminPanel'
import { supabase } from './supabaseClient'

function App() {
  const [reservas, setReservas] = useState([])
  const [vista, setVista] = useState('formulario')
  const [cargando, setCargando] = useState(true)

  const cargarReservas = async () => {
    try {
      setCargando(true)
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setReservas(data || [])
    } catch (error) {
      console.error('Error al cargar reservas:', error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarReservas()
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>Gestión de Reservas - Sala de Computación</h1>
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
          className={vista === 'admin' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setVista('admin')}
        >
          Administración
        </button>
      </nav>

      <main className="main">
        {cargando ? (
          <div className="loading">
            <p>Cargando reservas...</p>
          </div>
        ) : (
          <>
            {vista === 'formulario' && (
              <ReservationForm onReservaAgregada={cargarReservas} />
            )}
            {vista === 'tabla' && (
              <ReservationsTable reservas={reservas} />
            )}
            {vista === 'admin' && (
              <AdminPanel
                reservas={reservas}
                onActualizarReservas={cargarReservas}
              />
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>Sistema de Gestión de Reservas © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

export default App
