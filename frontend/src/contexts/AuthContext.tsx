import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api/endpoints'
import type { TokenResponse } from '../api/types'

interface AuthUser {
  id: number
  userName: string
  email: string
  fullName: string | null
  mustChangePassword: boolean
  roles: string[]
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<{ mustChangePassword: boolean }>
  logout: () => void
  clearMustChangePassword: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, isLoading: true })

  useEffect(() => {
    const token = localStorage.getItem('lm_token')
    const raw = localStorage.getItem('lm_user')
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as AuthUser
        setState({ user, token, isLoading: false })
      } catch {
        localStorage.removeItem('lm_token')
        localStorage.removeItem('lm_user')
        setState({ user: null, token: null, isLoading: false })
      }
    } else {
      setState({ user: null, token: null, isLoading: false })
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const resp: TokenResponse = await authApi.login(username, password)
    const user: AuthUser = {
      id: resp.userId,
      userName: resp.userName,
      email: resp.email,
      fullName: resp.fullName,
      mustChangePassword: resp.mustChangePassword,
      roles: resp.roles,
    }
    localStorage.setItem('lm_token', resp.token)
    localStorage.setItem('lm_user', JSON.stringify(user))
    setState({ user, token: resp.token, isLoading: false })
    return { mustChangePassword: resp.mustChangePassword }
  }, [])

  const clearMustChangePassword = useCallback(() => {
    setState(prev => {
      if (!prev.user) return prev
      const updated = { ...prev.user, mustChangePassword: false }
      localStorage.setItem('lm_user', JSON.stringify(updated))
      return { ...prev, user: updated }
    })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('lm_token')
    localStorage.removeItem('lm_user')
    setState({ user: null, token: null, isLoading: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
