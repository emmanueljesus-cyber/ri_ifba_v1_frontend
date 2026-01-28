import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificacoesService } from '../services/notificacoes'
import { useAuthStore } from './auth'
import type { Notificacao } from '../types/notificacao'

export const useNotificacoesStore = defineStore('notificacoes', () => {
  const notificacoes = ref<Notificacao[]>([])
  const loading = ref(false)

  const naoLidas = computed(() => notificacoes.value.filter(n => !n.lida_em))
  const contador = computed(() => naoLidas.value.length)

  // Helper para verificar se é admin
  function isAdmin(): boolean {
    try {
      const authStore = useAuthStore()
      return authStore.user?.perfil === 'admin'
    } catch {
      return false
    }
  }

  async function carregarNaoLidas() {
    // Prevent multiple simultaneous calls
    if (loading.value) return

    loading.value = true
    try {
      const admin = isAdmin()
      console.log('[Notificacoes] Carregando para perfil:', admin ? 'admin' : 'estudante')
      notificacoes.value = await notificacoesService.naoLidas(admin)
      console.log('[Notificacoes] Carregadas:', notificacoes.value.length)
    } catch (error) {
      console.error('[Notificacoes] Erro ao carregar:', error)
      // Silenciar erro - não é crítico para o funcionamento do app
      notificacoes.value = []
    } finally {
      loading.value = false
    }
  }

  async function marcarComoLida(id: number) {
    try {
      await notificacoesService.marcarComoLida(id, isAdmin())
      const notif = notificacoes.value.find(n => n.id === id)
      if (notif) {
        notif.lida_em = new Date().toISOString()
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  async function marcarTodasComoLidas() {
    try {
      await notificacoesService.marcarTodasComoLidas(isAdmin())
      notificacoes.value.forEach(n => {
        n.lida_em = new Date().toISOString()
      })
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  return {
    notificacoes,
    naoLidas,
    contador,
    loading,
    carregarNaoLidas,
    marcarComoLida,
    marcarTodasComoLidas
  }
})
