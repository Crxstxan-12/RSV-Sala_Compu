export const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [year, month, day] = fecha.split('-')
  return new Date(Number(year), Number(month) - 1, Number(day))
    .toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
}

export const fechaHoyLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
