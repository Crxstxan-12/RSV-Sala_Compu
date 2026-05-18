import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { supabase } from '../services/supabase'

const traducirErrorAuth = (error) => {
  const mensaje = error?.message || 'Ocurrió un error inesperado.'
  const status = error?.status
  const code = error?.code

  if (mensaje.includes('Invalid login credentials')) {
    return 'Credenciales inválidas. Verifica tu correo y contraseña.'
  }
  if (mensaje.includes('Email not confirmed')) {
    return 'Correo electrónico no confirmado. Por favor confirma tu correo.'
  }
  if (mensaje.includes('User already registered')) {
    return 'Este correo ya está registrado.'
  }
  if (mensaje.includes('Password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (mensaje.includes('JWT expired')) {
    return 'Tu sesión expiró. Por favor inicia sesión nuevamente.'
  }
  if (status === 403 || code === '42501') {
    return 'Permisos insuficientes. Verifica RLS y políticas en Supabase para "perfiles" y "reservas".'
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
      const { data, error: selectError } = await supabase
        .from('perfiles')
        .select('id,email,nombre,rol')
        .eq('id', userToLoad.id)
        .maybeSingle()

      if (selectError) throw selectError

      if (data) {
        setProfile(data)
        return
      }

      const nombreDesdeMetadata = userToLoad.user_metadata?.nombre
      const nombreFallback = nombreDesdeMetadata?.trim() ? nombreDesdeMetadata.trim() : userToLoad.email

      const { data: inserted, error: insertError } = await supabase
        .from('perfiles')
        .insert([{
          id: userToLoad.id,
          email: userToLoad.email,
          nombre: nombreFallback,
          rol: 'profesor'
        }])
        .select('id,email,nombre,rol')
        .single()

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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            rol: 'profesor'
          }
        }
      })
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
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
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
    }, 8000)

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
