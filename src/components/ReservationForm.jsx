import { useState } from 'react'
import { supabase } from '../supabaseClient'

function ReservationForm({ onReservaAgregada }) {
  const [formData, setFormData] = useState({
    nombre: '',
    curso: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    motivo: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const hayConflicto = (nuevaReserva, reservasExistentes) => {
    const { fecha, hora_inicio, hora_fin } = nuevaReserva
    return reservasExistentes.some(reserva => {
      if (reserva.fecha !== fecha || reserva.estado === 'rechazada') {
        return false
      }
      const inicioNuevo = new Date(`2000-01-01T${hora_inicio}`).getTime()
      const finNuevo = new Date(`2000-01-01T${hora_fin}`).getTime()
      const inicioExistente = new Date(`2000-01-01T${reserva.hora_inicio}`).getTime()
      const finExistente = new Date(`2000-01-01T${reserva.hora_fin}`).getTime()
      
      return !(finNuevo <= inicioExistente || inicioNuevo >= finExistente)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: reservasExistentes, error: fetchError } = await supabase
        .from('reservas')
        .select('*')
        .eq('fecha', formData.fecha)

      if (fetchError) throw fetchError

      if (hayConflicto(formData, reservasExistentes)) {
        throw new Error('Ya existe una reserva en ese horario')
      }

      const { error: insertError } = await supabase
        .from('reservas')
        .insert([{
          ...formData,
          estado: 'pendiente'
        }])

      if (insertError) throw insertError

      setSuccess('Reserva registrada exitosamente!')
      setFormData({
        nombre: '',
        curso: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        motivo: ''
      })
      
      if (onReservaAgregada) {
        onReservaAgregada()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h2>Reservar Sala de Computación</h2>
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre completo:</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="curso">Curso/Grupo:</label>
          <input
            type="text"
            id="curso"
            name="curso"
            value={formData.curso}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fecha">Fecha:</label>
          <input
            type="date"
            id="fecha"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hora_inicio">Hora de inicio:</label>
            <input
              type="time"
              id="hora_inicio"
              name="hora_inicio"
              value={formData.hora_inicio}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="hora_fin">Hora de término:</label>
            <input
              type="time"
              id="hora_fin"
              name="hora_fin"
              value={formData.hora_fin}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="motivo">Motivo de uso:</label>
          <textarea
            id="motivo"
            name="motivo"
            value={formData.motivo}
            onChange={handleChange}
            rows="3"
            required
          ></textarea>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Registrando...' : 'Registrar Reserva'}
        </button>
      </form>
    </div>
  )
}

export default ReservationForm
