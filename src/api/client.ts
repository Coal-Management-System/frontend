import axios from 'axios'
import { clearToken, getToken } from '@/lib/session'

export const http = axios.create({
  baseURL: '/api',
  timeout: 15000
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// An expired or missing session anywhere drops the user back to the login page.
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string | undefined = error?.config?.url
    if (error?.response?.status === 401 && !url?.includes('/auth/login')) {
      clearToken()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  }
)
