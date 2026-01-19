import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '../services/auth'
import type { AuthPayload, LoginRequest, RegisterRequest, User } from '../types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.perfil === 'admin')
  const isEstudante = computed(() => user.value?.perfil === 'estudante')

  function setSession(payload: AuthPayload) {
    user.value = payload.user
    token.value = payload.token
    localStorage.setItem('token', payload.token)
  }

  function clearSession() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  async function login(credentials: LoginRequest) {
    loading.value = true
    try {
      const data = await authService.login(credentials)
      setSession(data)
      return data
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterRequest) {
    loading.value = true
    try {
      const data = await authService.register(payload)
      setSession(data)
      return data
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return
    loading.value = true
    try {
      const data = await authService.me()
      user.value = data
    } catch (error) {
      clearSession()
      throw error
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } finally {
      clearSession()
    }
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    isEstudante,
    login,
    register,
    fetchMe,
    logout
  }
})
