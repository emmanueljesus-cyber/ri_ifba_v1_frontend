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

  async function register(payload: RegisterRequest, autoLogin = true) {
    loading.value = true
    try {
      const data = await authService.register(payload)
      if (autoLogin) {
        setSession(data)
      }
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
      // Normalização manual da foto para garantir consistência no store
      if (data.foto) {
         if (data.foto.startsWith('http')) {
            try {
               const url = new URL(data.foto)
               const index = url.pathname.indexOf('/storage/')
               if (index !== -1) {
                  data.foto = url.pathname.substring(index)
               }
            } catch (e) {
               // Mantém como está se der erro
            }
         } else if (!data.foto.startsWith('data:')) {
            const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace('/api/v1', '')
            const cleanPath = data.foto.startsWith('/') ? data.foto.substring(1) : data.foto
            const pathSemStorage = cleanPath.startsWith('storage/') ? cleanPath.substring(8) : cleanPath
            data.foto = baseUrl ? `${baseUrl}/storage/${pathSemStorage}` : `/storage/${pathSemStorage}`
         }
      }
      user.value = data
    } catch (error) {
      clearSession()
      throw error
    } finally {
      loading.value = false
    }
  }

  function updateUserData(data: Partial<User>) {
    if (user.value) {
      user.value = { ...user.value, ...data }
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
    logout,
    updateUserData
  }
})
