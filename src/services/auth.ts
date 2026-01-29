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
  },

  // Redefinição de senha
  async forgotPassword(email: string): Promise<string> {
    const { data } = await api.post<ApiResponse<null>>('/auth/forgot-password', { email })
    return data.message
  },

  async verifyResetToken(email: string, token: string): Promise<boolean> {
    try {
      await api.post('/auth/verify-reset-token', { email, token })
      return true
    } catch {
      return false
    }
  },

  async resetPassword(email: string, token: string, password: string, password_confirmation: string): Promise<string> {
    const { data } = await api.post<ApiResponse<null>>('/auth/reset-password', {
      email,
      token,
      password,
      password_confirmation
    })
    return data.message
  }
}
