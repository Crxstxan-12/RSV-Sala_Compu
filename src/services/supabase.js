import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export function withTimeout(promise, ms, message) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message || 'La operación tardó demasiado.'))
    }, ms)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => window.clearTimeout(timeoutId))
}
