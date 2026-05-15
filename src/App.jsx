import { useState, useEffect } from 'react'
import './App.css'
import Auth from './components/Auth'
import ReservationForm from './components/ReservationForm'
import ReservationsTable from './components/ReservationsTable'
import AdminPanel from './components/AdminPanel'
import { supabase } from './supabaseClient'

function App() {
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [reservas, setReservas] = useState([])
  const [vista, setVista] = useState('formulario')
  const [cargando, setCargando] = useState(true)
  const [cargandoAuth, setCargandoAuth] = useState(true)

  const esAdmin = perfil?.rol === 'admin'

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

  const cargarPerfil = async (userId) => {
    try {
      let { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: { user } } = await supabase.auth.getUser()
          const { data: newProfile, error: insertError } = await supabase
            .from('perfiles')
            .insert([{
              id: userId,
              nombre: user?.email?.split('@')[0] || 'Usuario',
              rol: 'profesor'
            }])
            .select()
            .single()

          if (insertError) throw insertError
          data = newProfile
        } else {
          throw error
        }
      }

      setPerfil(data)
    } catch (error) {
      console.error('Error al cargar perfil:', error)
    }
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    setUsuario(null)
    setPerfil(null)
  }

  useEffect(() => {
    const obtenerSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUsuario(session.user)
        await cargarPerfil(session.user.id)
      }
      setCargandoAuth(false)
    }

    obtenerSesion()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUsuario(session.user)
          await cargarPerfil(session.user.id)
        } else {
          setUsuario(null)
          setPerfil(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (usuario) {
      cargarReservas()
    }
  }, [usuario])

  if (cargandoAuth) {
    return (
      <div className="app">
        <div className="loading">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return <Auth />
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Gestión de Reservas - Sala de Computación</h1>
          <div className="header-user">
            <span className="user-info">
              {perfil?.nombre} ({perfil?.rol === 'admin' ? 'Encargado Sala Computación' : 'Profesor'})
            </span>
            <button onClick={cerrarSesion} className="btn-small btn-logout">
              Cerrar Sesión
            </button>
          </div>
        </div>
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
        {esAdmin && (
          <button
            className={vista === 'admin' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setVista('admin')}
          >
            Administración
          </button>
        )}
      </nav>

      <main className="main">
        {cargando ? (
          <div className="loading">
            <p>Cargando reservas...</p>
          </div>
        ) : (
          <>
            {vista === 'formulario' && (
              <ReservationForm 
                usuario={usuario} 
                perfil={perfil}
                onReservaAgregada={cargarReservas} 
              />
            )}
            {vista === 'tabla' && (
              <ReservationsTable reservas={reservas} />
            )}
            {vista === 'admin' && esAdmin && (
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
