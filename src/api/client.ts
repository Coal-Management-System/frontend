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
// Exception: the public QR passport (/qr/:type/:id) is opened by anonymous phone
// cameras with no session, so a 401 there must NOT bounce the visitor to /login —
// it is surfaced inline by the view instead.
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string | undefined = error?.config?.url
    const onPublicQrPage = window.location.pathname.startsWith('/qr/')
    if (
      error?.response?.status === 401 &&
      !url?.includes('/auth/login') &&
      !onPublicQrPage
    ) {
      clearToken()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  }
)
