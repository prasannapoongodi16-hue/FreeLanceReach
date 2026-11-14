import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { TOKEN_KEY } from '../lib/api'
import AuthContext from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(window.localStorage.getItem(TOKEN_KEY)))

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser((current) => current ? { ...current, ...updates } : current)
  }, [])

  useEffect(() => {
    let active = true
    const token = window.localStorage.getItem(TOKEN_KEY)
    if (!token) return () => { active = false }

    api.get('/auth/me')
      .then(({ data }) => { if (active) setUser(data.user) })
      .catch(() => { if (active) clearSession() })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [clearSession])

  const authenticate = useCallback(async (endpoint, credentials) => {
    const { data } = await api.post(`/auth/${endpoint}`, credentials)
    window.localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback((credentials) => authenticate('login', credentials), [authenticate])
  const register = useCallback((details) => authenticate('register', details), [authenticate])

  const logout = useCallback(async () => {
    try {
      if (window.localStorage.getItem(TOKEN_KEY)) await api.post('/auth/logout')
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(() => ({ user, loading, login, register, logout, updateUser }), [user, loading, login, register, logout, updateUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
