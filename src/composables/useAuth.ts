import { computed, reactive } from 'vue'
import { authApi } from '@/api/auth'
import type { AuthUserDto } from '@/api/types'
import { clearToken, getToken, setToken } from '@/lib/session'

// Module-level so every view and the app shell see the same logged-in user.
const state = reactive<{ user: AuthUserDto | null }>({ user: null })

export function useAuth() {
  async function login(username: string, password: string): Promise<AuthUserDto> {
    const res = await authApi.login({ username, password })
    setToken(res.token)
    state.user = res.user
    return res.user
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // The session may already be gone server-side; local cleanup still runs.
    }
    clearToken()
    state.user = null
  }

  /** Restores the user profile for a stored token; clears the token when it is dead. */
  async function loadMe(): Promise<AuthUserDto | null> {
    if (!getToken()) {
      state.user = null
      return null
    }
    try {
      state.user = await authApi.me()
      return state.user
    } catch {
      clearToken()
      state.user = null
      return null
    }
  }

  return { user: computed(() => state.user), login, logout, loadMe }
}
