import { http } from './client'
import type { AuthUserDto, LoginRequest, LoginResponse } from './types'

export const authApi = {
  login: (req: LoginRequest) => http.post<LoginResponse>('/auth/login', req).then(r => r.data),
  logout: () => http.post<void>('/auth/logout').then(() => undefined),
  me: () => http.get<AuthUserDto>('/auth/me').then(r => r.data)
}
