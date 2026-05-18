import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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

function createTimeoutFetch(timeoutMs) {
  return async (input, init = {}) => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

    let combinedSignal = controller.signal
    if (init.signal) {
      const parentSignal = init.signal
      if (parentSignal.aborted) {
        controller.abort()
      } else {
        parentSignal.addEventListener('abort', () => controller.abort(), { once: true })
      }
    }

    try {
      return await fetch(input, { ...init, signal: combinedSignal })
    } finally {
      window.clearTimeout(timeoutId)
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: createTimeoutFetch(20000)
  }
})
