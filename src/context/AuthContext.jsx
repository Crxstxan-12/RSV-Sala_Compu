import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { supabase, supabaseConfigured, withTimeout } from '../services/supabase'

const traducirErrorAuth = (error) => {
  const mensaje = error?.message || 'Ocurrió un error inesperado.'
  const status = error?.status
  const code = error?.code

  if (mensaje.includes('Invalid login credentials') || mensaje.includes('invalid_credentials')) {
    return 'Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.'
  }
  if (mensaje.includes('Email not confirmed') || mensaje.includes('email_not_confirmed')) {
    return 'Correo electrónico no confirmado. Por favor revisa tu bandeja de entrada y confirma tu correo.'
  }
  if (mensaje.includes('User already registered') || mensaje.includes('user_already_exists') || mensaje.includes('already registered')) {
    return 'Este correo ya está registrado. Intenta iniciar sesión.'
  }
  if (mensaje.includes('Password should be at least') || mensaje.includes('password_too_short')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (mensaje.includes('JWT expired') || mensaje.includes('session_expired') || mensaje.includes('token_expired')) {
    return 'Tu sesión expiró. Por favor inicia sesión nuevamente.'
  }
  if (mensaje.includes('Email rate limit') || mensaje.includes('over_email_send_rate_limit') || mensaje.includes('email_rate_limit')) {
    return 'Demasiados intentos. Espera unos minutos antes de intentar nuevamente.'
  }
  if (mensaje.includes('Too many requests') || mensaje.includes('over_request_rate_limit') || mensaje.includes('rate_limit')) {
    return 'Demasiadas solicitudes. Espera unos minutos e intenta nuevamente.'
  }
  if (mensaje.includes('For security purposes, you can only request this after')) {
    return 'Por seguridad, espera unos minutos antes de volver a intentarlo.'
  }
  if (mensaje.includes('Signup is disabled') || mensaje.includes('signups_disabled')) {
    return 'El registro de nuevas cuentas está deshabilitado. Contacta al administrador.'
  }
  if (mensaje.includes('User not found') || mensaje.includes('user_not_found')) {
    return 'No se encontró ninguna cuenta con ese correo.'
  }
  if (mensaje.includes('New password should be different') || mensaje.includes('same_password')) {
    return 'La nueva contraseña debe ser diferente a la anterior.'
  }
  if (mensaje.includes('Weak password') || mensaje.includes('weak_password')) {
    return 'La contraseña es demasiado débil. Usa al menos 6 caracteres con letras y números.'
  }
  if (mensaje.includes('Invalid email') || mensaje.includes('invalid_email') || mensaje.includes('Unable to validate email')) {
    return 'El correo electrónico ingresado no es válido.'
  }
  if (
    mensaje.includes('Failed to fetch') ||
    mensaje.includes('NetworkError') ||
    mensaje.includes('Load failed') ||
    mensaje.includes('The operation was aborted') ||
    mensaje.includes('AbortError') ||
    mensaje.includes('fetch')
  ) {
    return 'Sin conexión a internet. Revisa tu red e intenta nuevamente.'
  }
  if (status === 403 || code === '42501') {
    return 'Permisos insuficientes. Verifica RLS y políticas en Supabase para "perfiles" y "reservas".'
  }
  if (status === 401) {
    return 'No autorizado. Por favor inicia sesión nuevamente.'
  }
  if (status === 422) {
    return 'Datos inválidos. Verifica que tu correo y contraseña sean correctos.'
  }
  if (status === 500 || status === 503) {
    return 'Error del servidor. Intenta nuevamente en unos minutos.'
  }

  // Si el mensaje viene en inglés (contiene palabras comunes en inglés), reemplazar por genérico
  if (/\b(error|invalid|failed|cannot|unable|unexpected|forbidden|unauthorized|not found|conflict|timeout)\b/i.test(mensaje)) {
    return 'Ocurrió un error inesperado. Intenta nuevamente o contacta al administrador.'
  }

  return mensaje
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [error, setError] = useState('')

  const fetchProfile = useCallback(async (userToLoad) => {
    if (!userToLoad?.id) return

    setLoadingProfile(true)
    setError('')

    try {
      if (!supabaseConfigured) {
        throw new Error('Faltan variables de entorno de Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.')
      }

      const { data, error: selectError } = await withTimeout(
        supabase
        .from('perfiles')
        .select('id,email,nombre,rol')
        .eq('id', userToLoad.id)
        .maybeSingle(),
        20000,
        'No se pudo cargar tu perfil. Revisa tu conexión e intenta nuevamente.'
      )

      if (selectError) throw selectError

      if (data) {
        setProfile(data)
        return
      }

      const nombreDesdeMetadata = userToLoad.user_metadata?.nombre
      const nombreFallback = nombreDesdeMetadata?.trim() ? nombreDesdeMetadata.trim() : userToLoad.email

      const { data: inserted, error: insertError } = await withTimeout(
        supabase
        .from('perfiles')
        .insert([{
          id: userToLoad.id,
          email: userToLoad.email,
          nombre: nombreFallback,
          rol: 'profesor'
        }])
        .select('id,email,nombre,rol')
        .single(),
        20000,
        'No se pudo crear tu perfil. Revisa tu conexión e intenta nuevamente.'
      )

      if (insertError) throw insertError
      setProfile(inserted)
    } catch (e) {
      setProfile(null)
      setError(traducirErrorAuth(e))
    } finally {
      setLoadingProfile(false)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await fetchProfile(user)
  }, [fetchProfile, user])

  const signIn = useCallback(async ({ email, password }) => {
    setError('')
    try {
      if (!supabaseConfigured) {
        throw new Error('Faltan variables de entorno de Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.')
      }

      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        20000,
        'No se pudo conectar con Supabase para iniciar sesión. Revisa tu conexión e intenta nuevamente.'
      )
      if (error) throw error
      return data
    } catch (e) {
      setError(traducirErrorAuth(e))
      throw e
    }
  }, [])

  const signUp = useCallback(async ({ email, password, nombre }) => {
    setError('')
    try {
      if (!supabaseConfigured) {
        throw new Error('Faltan variables de entorno de Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.')
      }

      const { data, error } = await withTimeout(
        supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            rol: 'profesor'
          }
        }
      }),
        20000,
        'No se pudo conectar con Supabase para registrarse. Revisa tu conexión e intenta nuevamente.'
      )
      if (error) throw error
      return data
    } catch (e) {
      setError(traducirErrorAuth(e))
      throw e
    }
  }, [])

  const signOut = useCallback(async () => {
    setError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (e) {
      setError(traducirErrorAuth(e))
      throw e
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        if (!supabaseConfigured) {
          throw new Error('Faltan variables de entorno de Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.')
        }

        const { data: { session: currentSession }, error: sessionError } = await withTimeout(
          supabase.auth.getSession(),
          20000,
          'No se pudo conectar con Supabase para recuperar la sesión.'
        )
        if (!isMounted) return

        if (sessionError) {
          setError(traducirErrorAuth(sessionError))
        }

        setSession(currentSession || null)
        setUser(currentSession?.user || null)

        if (currentSession?.user) {
          await fetchProfile(currentSession.user)
        } else {
          setProfile(null)
        }
      } catch (e) {
        if (isMounted) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setError(traducirErrorAuth(e))
        }
      } finally {
        if (isMounted) {
          setLoadingSession(false)
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      if (!isMounted) return
      setError('La sesión está tardando demasiado en inicializar. Revisa tu conexión y vuelve a cargar la página.')
      setLoadingSession(false)
    }, 25000)

    init()
      .finally(() => window.clearTimeout(timeoutId))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession || null)
      setUser(nextSession?.user || null)
      if (nextSession?.user) {
        await fetchProfile(nextSession.user)
      } else {
        setProfile(null)
      }
    })

    return () => {
      isMounted = false
      window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const value = useMemo(() => {
    return {
      session,
      user,
      profile,
      loadingSession,
      loadingProfile,
      error,
      setError,
      signIn,
      signUp,
      signOut,
      refreshProfile
    }
  }, [error, loadingProfile, loadingSession, profile, refreshProfile, session, signIn, signOut, signUp, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
