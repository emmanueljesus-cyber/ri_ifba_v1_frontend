import api from './api'
import type { AuthPayload, LoginRequest, RegisterRequest, User } from '../types/auth'

interface ApiResponse<T> {
  data: T
  message: string
}

export const authService = {
  async login(payload: LoginRequest): Promise<AuthPayload> {
    const { data } = await api.post<ApiResponse<AuthPayload>>('/auth/login', payload)
    return data.data
  },

  async register(payload: RegisterRequest): Promise<AuthPayload> {
    const { data } = await api.post<ApiResponse<AuthPayload>>('/auth/register', payload)
    return data.data
  },

  async me(): Promise<User> {
    const { data } = await api.get<ApiResponse<User>>('/auth/me')
    return data.data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  }
}
