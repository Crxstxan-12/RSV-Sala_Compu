import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase, withTimeout } from '../services/supabase'

const RECURSOS = [
  'Data / Proyector',
  'Televisor',
]

export default function EquipmentRequestForm({ onSolicitudAgregada }) {
  const { user, profile } = useAuth()
  const [formData, setFormData] = useState({
    curso: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    recurso: '',
    motivo: '',
    observaciones: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const nombreMostrado = useMemo(() => {
    const nombre = profile?.nombre?.trim()
    return nombre ? nombre : user?.email
  }, [profile?.nombre, user?.email])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (formData.hora_fin <= formData.hora_inicio) {
        throw new Error('La hora de término debe ser posterior a la hora de inicio.')
      }

      const { data: { user: authUser }, error: userError } = await withTimeout(
        supabase.auth.getUser(),
        20000,
        'No se pudo validar tu sesión. Revisa tu conexión e intenta nuevamente.'
      )
      if (userError) throw userError
      if (!authUser?.id) throw new Error('No se pudo identificar al usuario. Vuelve a iniciar sesión.')

      const { data: existentes, error: fetchError } = await withTimeout(
        supabase.from('solicitudes_equipos').select('*').eq('fecha', formData.fecha),
        20000,
        'No se pudo verificar disponibilidad. Revisa tu conexión e intenta nuevamente.'
      )
      if (fetchError) throw fetchError

      const conflicto = (existentes || []).some(s => {
        if (s.recurso !== formData.recurso) return false
        if (s.estado === 'rechazada' || s.estado === 'devuelta') return false
        const inicioNuevo = new Date(`2000-01-01T${formData.hora_inicio}`).getTime()
        const finNuevo = new Date(`2000-01-01T${formData.hora_fin}`).getTime()
        const inicioExist = new Date(`2000-01-01T${s.hora_inicio}`).getTime()
        const finExist = new Date(`2000-01-01T${s.hora_fin}`).getTime()
        return !(finNuevo <= inicioExist || inicioNuevo >= finExist)
      })

      if (conflicto) {
        throw new Error(`No hay equipos disponibles. El "${formData.recurso}" ya está pedido en ese horario.`)
      }

      const { error: insertError } = await withTimeout(
        supabase.from('solicitudes_equipos').insert([{
          nombre: profile?.nombre?.trim() || authUser.email,
          curso: formData.curso,
          fecha: formData.fecha,
          hora_inicio: formData.hora_inicio,
          hora_fin: formData.hora_fin,
          recurso: formData.recurso,
          cantidad: 1,
          motivo: formData.motivo,
          observaciones: formData.observaciones || null,
          estado: 'pendiente',
          usuario_id: authUser.id,
        }]),
        20000,
        'No se pudo registrar la solicitud. Revisa tu conexión e intenta nuevamente.'
      )
      if (insertError) throw insertError

      setSuccess('Solicitud registrada exitosamente.')
      setFormData({
        curso: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        recurso: '',
        motivo: '',
        observaciones: '',
      })
      if (onSolicitudAgregada) onSolicitudAgregada()
    } catch (err) {
      setError(err?.message || 'No se pudo registrar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h2>Solicitar Recurso Tecnológico</h2>
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Solicitante:</label>
          <input type="text" value={nombreMostrado || ''} disabled className="input-disabled" />
        </div>

        <div className="form-group">
          <label htmlFor="eq-curso">Curso:</label>
          <input
            type="text"
            id="eq-curso"
            name="curso"
            value={formData.curso}
            onChange={handleChange}
            placeholder="Ej: 4°A"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="eq-fecha">Fecha:</label>
          <input
            type="date"
            id="eq-fecha"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            max={`${new Date().getFullYear()}-12-31`}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="eq-hora-inicio">Hora de inicio:</label>
            <input
              type="time"
              id="eq-hora-inicio"
              name="hora_inicio"
              value={formData.hora_inicio}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="eq-hora-fin">Hora de término:</label>
            <input
              type="time"
              id="eq-hora-fin"
              name="hora_fin"
              value={formData.hora_fin}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="eq-recurso">Recurso solicitado:</label>
          <select
            id="eq-recurso"
            name="recurso"
            value={formData.recurso}
            onChange={handleChange}
            required
            className="form-select"
          >
            <option value="">Selecciona un recurso</option>
            {RECURSOS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="eq-motivo">Motivo de uso:</label>
          <textarea
            id="eq-motivo"
            name="motivo"
            value={formData.motivo}
            onChange={handleChange}
            rows="3"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="eq-obs">Observaciones (opcional):</label>
          <textarea
            id="eq-obs"
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            rows="2"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Verificando disponibilidad...' : 'Enviar Solicitud'}
        </button>
      </form>
    </div>
  )
}
